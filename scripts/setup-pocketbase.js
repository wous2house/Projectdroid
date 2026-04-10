import PocketBase from 'pocketbase';

// =========================================================================
// SCRIPT VOOR HET SETUP VAN DE POCKETBASE COLLECTIES (v0.23 - v0.38 compatible)
// Inclusief alle financiële en uren-gerelateerde velden.
// =========================================================================

const pb = new PocketBase('https://db.projectdroid.nl');
const adminEmail = process.argv[2];
const adminPass = process.argv[3];

if (!adminEmail || !adminPass) {
  console.error('❌ Gebruik: node scripts/setup-pocketbase.js <admin-email> <admin-password>');
  process.exit(1);
}

async function setup() {
  console.log('🚀 Start PocketBase schema herstel...');

  try {
    await pb.admins.authWithPassword(adminEmail, adminPass);
    console.log('✅ Ingelogd als admin.');
  } catch (err) {
    console.error('❌ Inloggen mislukt.');
    process.exit(1);
  }

  async function getCollectionId(name) {
    try {
      const coll = await pb.collections.getOne(name);
      return coll.id;
    } catch (e) { return null; }
  }

  // 1. DELETE PHASE (Safe order)
  console.log('\n🗑️  Bestaande collecties opschonen...');
  for (const name of ['activities', 'projects', 'customers', 'settings']) {
    const id = await getCollectionId(name);
    if (id) await pb.collections.delete(id);
  }

  const usersId = await getCollectionId('users');

  // 2. CREATE PHASE
  console.log('\n🏗️  Collecties aanmaken met volledige veldlijst...');

  // 2a. Customers
  const customersColl = await pb.collections.create({
    name: 'customers',
    type: 'base',
    fields: [
      { name: 'name', type: 'text', required: true },
      { name: 'email', type: 'email' },
      { name: 'phone', type: 'text' },
      { name: 'address', type: 'text' },
      { name: 'hourlyRate', type: 'number' },
      { name: 'logo', type: 'file', maxSelect: 1, maxSize: 5242880, mimeTypes: ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'] }
    ],
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id != ""',
    deleteRule: '@request.auth.id != ""',
  });

  // 2b. Projects (VOLLEDIGE LIJST)
  const projectsColl = await pb.collections.create({
    name: 'projects',
    type: 'base',
    fields: [
      { name: 'name', type: 'text', required: true },
      { name: 'description', type: 'text' },
      { name: 'status', type: 'select', required: true, values: ['Voorstel', 'Geakkoordeerd', 'On Hold', 'Actief', 'Afgerond'] },
      { name: 'owner', type: 'relation', required: true, collectionId: usersId, maxSelect: 1 },
      { name: 'customer', type: 'relation', collectionId: customersColl.id, maxSelect: 1 },
      { name: 'team', type: 'relation', collectionId: usersId, maxSelect: 100 },
      { name: 'startDate', type: 'date' },
      { name: 'endDate', type: 'date' },
      { name: 'totalPrice', type: 'number' },
      { name: 'priceNote', type: 'text' },
      { name: 'phases_json', type: 'json' },
      { name: 'tasks_json', type: 'json' },
      { name: 'invoices_json', type: 'json' },
      { name: 'expenses_json', type: 'json' },
      { name: 'requirements_json', type: 'json' },
      { name: 'attachments_json', type: 'json' },
      { name: 'requirementNotes_json', type: 'json' },
      { name: 'lockedPrices_json', type: 'json' },
      { name: 'customRecurring_json', type: 'json' },
      { name: 'ignoredRecurring_json', type: 'json' },
      { name: 'overriddenRecurring_json', type: 'json' },
      { name: 'customOneTime_json', type: 'json' },
      { name: 'ignoredOneTime_json', type: 'json' },
      { name: 'overriddenOneTime_json', type: 'json' },
      { name: 'isHourlyRateActive', type: 'bool' },
      { name: 'hourlyRate', type: 'number' },
      { name: 'trackedSeconds', type: 'number' },
      { name: 'isTimerRunning', type: 'bool' },
      { name: 'timerStartedAt', type: 'date' },
      { name: 'activeTimerTaskId', type: 'text' },
      { name: 'isTimerBillable', type: 'bool' },
      { name: 'timeEntries_json', type: 'json' }
    ],
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id != ""',
    deleteRule: '@request.auth.id != ""',
  });

  // 2c. Activities
  await pb.collections.create({
    name: 'activities',
    type: 'base',
    fields: [
      { name: 'type', type: 'text', required: true },
      { name: 'title', type: 'text', required: true },
      { name: 'user', type: 'relation', required: true, collectionId: usersId, maxSelect: 1 },
      { name: 'timestamp', type: 'date', required: true },
      { name: 'project', type: 'relation', collectionId: projectsColl.id, maxSelect: 1 },
      { name: 'projectName', type: 'text' },
      { name: 'details', type: 'text' }
    ],
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id != ""',
    deleteRule: '@request.auth.id != ""',
  });

  // 2d. Settings
  await pb.collections.create({
    name: 'settings',
    type: 'base',
    fields: [
      { name: 'key', type: 'text', required: true },
      { name: 'data', type: 'json' }
    ],
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id != ""',
    deleteRule: '@request.auth.id != ""',
  });

  // 3. USERS UPDATE
  console.log('\n👤 Users collectie bijwerken...');
  try {
    const userColl = await pb.collections.getOne('users');
    const customFields = [
      { name: 'role', type: 'select', required: true, values: ['admin', 'user'] },
      { name: 'title', type: 'text' },
      { name: 'bio', type: 'text' },
      { name: 'avatar', type: 'file', maxSelect: 1, maxSize: 5242880, mimeTypes: ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'] }
    ];
    let fields = userColl.fields || [];
    for (const f of customFields) {
      const existing = fields.find(ef => ef.name === f.name);
      if (!existing) fields.push(f);
      else Object.assign(existing, f);
    }
    
    // Set view/list rules to allow all authenticated users to see other users
    await pb.collections.update(userColl.id, { 
      fields,
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""'
    });
    console.log('✅ Users bijgewerkt met juiste velden en rechten.');
  } catch (err) { console.error('❌ Fout bij users:', err.message); }

  console.log('\n🎉 PocketBase herstel voltooid! Draai nu de import.');
}

setup();
