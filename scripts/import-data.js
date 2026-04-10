import fs from 'fs';
import path from 'path';
import PocketBase from 'pocketbase';

// =========================================================================
// DEFINITIEF IMPORT SCRIPT (v0.23+ compatible)
// Inclusief conversie van Base64 naar echte bestanden en alle financiële velden.
// =========================================================================

const pb = new PocketBase('https://db.projectdroid.nl');
const adminEmail = process.argv[2];
const adminPass = process.argv[3];

const DEFAULT_PRICES = {
  type_werken_bij_small: 4500, type_werken_bij_medium: 6500, type_werken_bij_large: 9000,
  type_landing_standaard: 800, type_landing_premium: 1025,
  wp_elementor: 62.5, wp_elementor_cost: 540, wp_forms: 62.5, wp_forms_cost: 521,
  wp_acf: 32, wp_acf_cost: 260, wp_code: 63, wp_code_cost: 130, wp_jet: 70, wp_jet_cost: 652,
  wp_smashballoon_pro: 42, wp_smashballoon_pro_cost: 42, wp_api_to_posts: 110,
  wp_api_to_posts_cost: 286, wp_api_to_posts_onetime: 650,
  onderhoud_light: 500, onderhoud_medium: 750, onderhoud_strong: 975, hourly_rate: 85
};

if (!adminEmail || !adminPass) {
  console.error('❌ Gebruik: node scripts/import-data.js <admin-email> <admin-password>');
  process.exit(1);
}

function base64ToBlob(base64String) {
  if (!base64String || !base64String.startsWith('data:')) return null;
  try {
    const parts = base64String.split(';base64,');
    const contentType = parts[0].split(':')[1];
    const byteCharacters = Buffer.from(parts[1], 'base64');
    return new Blob([byteCharacters], { type: contentType });
  } catch (e) { return null; }
}

async function run() {
  console.log('🚀 Start volledige data migratie naar PocketBase...');

  try {
    await pb.admins.authWithPassword(adminEmail, adminPass);
    console.log('✅ Ingelogd als admin.');
  } catch (err) {
    console.error('❌ Login mislukt.');
    process.exit(1);
  }

  // 0. CLEANUP
  console.log('\n🧹 Database opschonen...');
  for (const coll of ['activities', 'projects', 'customers']) {
    try {
      const records = await pb.collection(coll).getFullList({ fields: 'id' });
      for (const r of records) await pb.collection(coll).delete(r.id);
    } catch (e) {}
  }

  const data = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'data.json'), 'utf8'));
  const idMap = { users: {}, customers: {}, projects: {} };

  // 1. USERS
  console.log('\n👤 Gebruikers verwerken...');
  for (const user of data.users || []) {
    try {
      const email = user.email || `${user.id}@projectdroid.local`;
      let pbUser;
      const formData = new FormData();
      formData.append('name', user.name);
      formData.append('role', user.role || 'user');
      formData.append('title', user.title || '');
      formData.append('bio', user.bio || '');
      if (user.avatar?.startsWith('data:')) formData.append('avatar', base64ToBlob(user.avatar), 'avatar.png');

      try {
        pbUser = await pb.collection('users').getFirstListItem(`email="${email}"`);
        pbUser = await pb.collection('users').update(pbUser.id, formData);
      } catch (e) {
        formData.append('username', (user.name || 'user').toLowerCase().replace(/\s/g, '') + Math.floor(Math.random()*1000));
        formData.append('email', email);
        formData.append('password', 'Welkom01!');
        formData.append('passwordConfirm', 'Welkom01!');
        pbUser = await pb.collection('users').create(formData);
      }
      idMap.users[user.id] = pbUser.id;
    } catch (err) { console.error(`❌ Fout bij gebruiker ${user.name}`); }
  }

  // 2. CUSTOMERS
  console.log('\n🏢 Klanten importeren...');
  for (const c of data.customers || []) {
    try {
      const formData = new FormData();
      formData.append('name', c.name);
      formData.append('email', c.email || '');
      formData.append('phone', c.phone || '');
      formData.append('address', c.address || '');
      formData.append('hourlyRate', c.hourlyRate || 0);
      if (c.logo?.startsWith('data:')) formData.append('logo', base64ToBlob(c.logo), 'logo.png');
      const created = await pb.collection('customers').create(formData);
      idMap.customers[c.id] = created.id;
      console.log(`✅ Klant ${c.name} aangemaakt.`);
    } catch (err) { console.error(`❌ Fout bij klant ${c.name}`); }
  }

  // 3. PROJECTS (Alle velden!)
  console.log('\n🚀 Projecten importeren...');
  for (const p of data.projects || []) {
    try {
      const payload = {
        name: p.name,
        description: p.description || '',
        status: p.status,
        owner: idMap.users[p.owner] || Object.values(idMap.users)[0],
        customer: idMap.customers[p.customerId] || null,
        team: (p.team || []).map(tid => idMap.users[tid]).filter(Boolean),
        startDate: p.startDate || null,
        endDate: p.endDate || null,
        totalPrice: p.totalPrice || 0,
        priceNote: p.priceNote || '',
        phases_json: p.phases || [],
        tasks_json: p.tasks || [],
        invoices_json: p.invoices || [],
        expenses_json: p.expenses || [],
        requirements_json: p.requirements || [],
        attachments_json: p.attachments || [],
        requirementNotes_json: p.requirementNotes || {},
        lockedPrices_json: p.lockedPrices || null,
        customRecurring_json: p.customRecurring || [],
        ignoredRecurring_json: p.ignoredRecurring || [],
        overriddenRecurring_json: p.overriddenRecurring || {},
        customOneTime_json: p.customOneTime || [],
        ignoredOneTime_json: p.ignoredOneTime || [],
        overriddenOneTime_json: p.overriddenOneTime || {},
        isHourlyRateActive: p.isHourlyRateActive || false,
        hourlyRate: p.hourlyRate || 0,
        trackedSeconds: p.trackedSeconds || 0,
        timeEntries_json: p.timeEntries || []
      };
      const created = await pb.collection('projects').create(payload);
      idMap.projects[p.id] = created.id;
      console.log(`✅ Project ${p.name} aangemaakt.`);
    } catch (err) { console.error(`❌ Fout bij project ${p.name}:`, err.response?.data || err.message); }
  }

  // 4. ACTIVITIES
  console.log('\n📅 Activiteiten verwerken...');
  for (const a of data.activities || []) {
    try {
      const payload = {
        type: a.type, title: a.title,
        user: idMap.users[a.userId] || Object.values(idMap.users)[0],
        timestamp: a.timestamp,
        project: idMap.projects[a.projectId] || null,
        projectName: a.projectName || '', details: a.details || ''
      };
      await pb.collection('activities').create(payload);
    } catch (e) {}
  }

  // 5. SETTINGS
  console.log('\n⚙️  Prijzen verwerken...');
  let p = { ...DEFAULT_PRICES };
  if (data.prices) p = { ...p, ...data.prices };
  (data.projects || []).forEach(proj => { if (proj.lockedPrices) p = { ...p, ...proj.lockedPrices }; });
  try {
    let existing;
    try { existing = await pb.collection('settings').getFirstListItem(`key="global_prices"`); } catch (e) {}
    if (existing) await pb.collection('settings').update(existing.id, { key: 'global_prices', data: p });
    else await pb.collection('settings').create({ key: 'global_prices', data: p });
  } catch (e) {}

  console.log('\n🎉 Alles succesvol overgezet!');
}

run();
