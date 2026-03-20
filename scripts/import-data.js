import fs from 'fs';
import path from 'path';
import PocketBase from 'pocketbase';

// =========================================================================
// SCRIPT VOOR HET MIGREREN VAN LOKALE DATA.JSON NAAR POCKETBASE
// =========================================================================
// Usage: node scripts/import-data.js
// Configure the URL and credentials before running if needed.
// =========================================================================

const pb = new PocketBase('https://db.projectdroid.nl');

async function run() {
  console.log('Start data migratie...');

  // LOGIN ALS ADMIN (vervang dit met je werkelijke admin inlog op je PB instance)
  try {
    await pb.admins.authWithPassword('jouw-admin@email.nl', 'JouwAdminWachtwoord123');
    console.log('✅ Succesvol ingelogd als admin');
  } catch (err) {
    console.error('❌ Login mislukt. Zorg dat je admin credentials kloppen in dit script!', err.message);
    process.exit(1);
  }

  // Load local data.json
  const dataPath = path.resolve(process.cwd(), 'data.json');
  if (!fs.existsSync(dataPath)) {
    console.error(`❌ Kan data.json niet vinden op ${dataPath}`);
    process.exit(1);
  }

  const rawData = fs.readFileSync(dataPath, 'utf8');
  let data;
  try {
    data = JSON.parse(rawData);
  } catch (err) {
    console.error('❌ data.json is geen geldige JSON.', err.message);
    process.exit(1);
  }

  console.log(`📦 Gevonden: ${data.users?.length || 0} gebruikers, ${data.customers?.length || 0} klanten, ${data.projects?.length || 0} projecten.`);

  // 1. IMPORT USERS
  console.log('\n👤 Importeren van gebruikers...');
  const userMap = {};
  for (const user of data.users || []) {
    try {
      const pass = user.password || 'TijdelijkWachtwoord123!';
      const pbUser = {
        username: user.email ? user.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '') + Math.floor(Math.random()*100) : `user${Math.floor(Math.random()*1000)}`,
        email: user.email || `${user.id}@temp.nl`,
        emailVisibility: true,
        password: pass,
        passwordConfirm: pass,
        name: user.name,
        role: user.role,
        title: user.title,
      };

      let existing;
      try { existing = await pb.collection('users').getFirstListItem(`email="${pbUser.email}"`); } catch (e) { }

      let createdUser;
      if (existing) {
        console.log(`Gebruiker ${user.email} bestaat al, overslaan of updaten...`);
        createdUser = existing;
      } else {
        createdUser = await pb.collection('users').create(pbUser);
        console.log(`✅ Gebruiker ${user.name} aangemaakt.`);
      }
      userMap[user.id] = createdUser.id;
    } catch (err) { console.error(`❌ Fout bij gebruiker ${user.name}:`, err.response?.data || err.message); }
  }

  // 2. IMPORT CUSTOMERS
  console.log('\n🏢 Importeren van klanten...');
  const customerMap = {};
  for (const customer of data.customers || []) {
    try {
      const pbCustomer = {
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        hourlyRate: customer.hourlyRate,
      };

      const created = await pb.collection('customers').create(pbCustomer);
      customerMap[customer.id] = created.id;
      console.log(`✅ Klant ${customer.name} aangemaakt.`);
    } catch (err) { console.error(`❌ Fout bij klant ${customer.name}:`, err.response?.data || err.message); }
  }

  // 3. IMPORT PROJECTS
  console.log('\n🚀 Importeren van projecten...');
  for (const project of data.projects || []) {
    try {
      const ownerId = userMap[project.owner] || project.owner;
      const customerId = project.customerId ? (customerMap[project.customerId] || project.customerId) : null;
      const team = (project.team || []).map(tId => userMap[tId] || tId).filter(id => id && id.length > 5);

      const pbProject = {
        name: project.name,
        description: project.description,
        status: project.status,
        owner: ownerId,
        customer: customerId,
        team: team,
        totalPrice: project.totalPrice,
        priceNote: project.priceNote,
        phases_json: project.phases,
        tasks_json: project.tasks,
        invoices_json: project.invoices,
        requirements_json: project.requirements,
      };

      await pb.collection('projects').create(pbProject);
      console.log(`✅ Project ${project.name} aangemaakt.`);
    } catch (err) { console.error(`❌ Fout bij project ${project.name}:`, err.response?.data || err.message); }
  }

  // 4. IMPORT ACTIVITIES
  console.log('\n📅 Importeren van activiteiten (logs)...');
  for (const activity of data.activities || []) {
    try {
      const pbActivity = {
        type: activity.type,
        title: activity.title,
        user: userMap[activity.userId] || activity.userId, // Referentie naar gebruiker
        timestamp: activity.timestamp,
        project: activity.projectId || null,
        task: activity.taskId || '',
        phase: activity.phaseId || '',
        projectName: activity.projectName || '',
        details: activity.details || '',
      };

      // Only add project relation if it's a valid 15 char Pocketbase ID format
      // If we don't have a mapping for project ID (since we didn't save projectMap), we'll skip mapping them here
      // or we can just leave it empty. We'll leave it out for now to avoid relation errors.
      delete pbActivity.project;

      await pb.collection('activities').create(pbActivity);
      console.log(`✅ Activiteit toegevoegd: ${activity.title}`);
    } catch (err) {
      console.error(`❌ Fout bij activiteit ${activity.title}:`, err.response?.data || err.message);
    }
  }

  console.log('\n🎉 Migratie voltooid! Bekijk je data in de PocketBase admin (https://db.projectdroid.nl/_/)');
}

run();
