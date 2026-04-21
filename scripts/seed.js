import { faker } from '@faker-js/faker/locale/nl';
import PocketBase from 'pocketbase';
import dotenv from 'dotenv';

// Laad variabelen uit .env.local, of val terug op standaard admin gegevens voor dev omgeving
dotenv.config({ path: '.env.local' });

const pb = new PocketBase(process.env.POCKETBASE_URL || 'http://127.0.0.1:8090');
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'adminpassword';

async function run() {
  console.log('🚀 Start database seed...');

  try {
    await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log('✅ Ingelogd als admin.');
  } catch (err) {
    console.error('❌ Login mislukt. Controleer je credentials en of PocketBase lokaal draait.', err.message);
    process.exit(1);
  }

  // --- 1. Opschonen oude test-data ---
  console.log('\n🧹 Oude test-records verwijderen...');
  const collectionsToClear = ['projects', 'customers', 'users'];
  
  for (const coll of collectionsToClear) {
    try {
      const records = await pb.collection(coll).getFullList({ fields: 'id' });
      for (const r of records) {
        await pb.collection(coll).delete(r.id);
      }
      console.log(`✅ ${records.length} records verwijderd uit ${coll}.`);
    } catch (e) {
      console.warn(`⚠️ Kon collectie ${coll} niet legen (bestaat deze?).`, e.message);
    }
  }

  // --- 2. Users aanmaken (Minimaal 20 + de lokale test admin) ---
  console.log('\n👤 Dummy users aanmaken...');
  const userIds = [];

  // Voeg een consistente test user toe om mee in te loggen
  try {
    const adminRecord = await pb.collection('users').create({
      username: 'testadmin',
      email: ADMIN_EMAIL,
      emailVisibility: true,
      password: ADMIN_PASSWORD,
      passwordConfirm: ADMIN_PASSWORD,
      name: 'Lokale Test Admin',
      role: 'admin',
      title: 'System Administrator',
    });
    userIds.push(adminRecord.id);
    console.log(`✅ Test admin aangemaakt (${ADMIN_EMAIL})`);
  } catch (err) {
    console.error('Fout bij maken test admin (bestaat misschien al):', err.message);
  }

  for (let i = 0; i < 20; i++) {
    try {
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      
      const record = await pb.collection('users').create({
        username: faker.internet.username({ firstName, lastName }).toLowerCase().replace(/[^a-z0-9]/g, '') + faker.number.int({ min: 1, max: 999 }),
        email: faker.internet.email({ firstName, lastName }),
        emailVisibility: true,
        password: 'Password123!',
        passwordConfirm: 'Password123!',
        name: `${firstName} ${lastName}`,
        role: faker.helpers.arrayElement(['admin', 'user', 'manager']),
        title: faker.person.jobTitle(),
      });
      userIds.push(record.id);
    } catch (err) {
      console.error('Fout bij maken user:', err.message);
    }
  }
  console.log('✅ Users aangemaakt.');

  // --- 3. Klanten (Customers) aanmaken (Extra: nodig voor projecten) ---
  console.log('\n🏢 10 Dummy klanten aanmaken...');
  const customerIds = [];
  for (let i = 0; i < 10; i++) {
    try {
      const record = await pb.collection('customers').create({
        name: faker.company.name(),
        email: faker.internet.email(),
        phone: faker.phone.number(),
        address: faker.location.streetAddress(),
        hourlyRate: faker.number.int({ min: 50, max: 150 }),
      });
      customerIds.push(record.id);
    } catch (err) {
      console.error('Fout bij maken klant:', err.message);
    }
  }
  console.log('✅ Klanten aangemaakt.');

  // --- 4. Projecten aanmaken (ipv Posts, minimaal 50) ---
  console.log('\n🚀 50 Dummy projecten aanmaken...');
  for (let i = 0; i < 50; i++) {
    try {
      // Willekeurige owner en klant koppelen
      const ownerId = faker.helpers.arrayElement(userIds);
      const customerId = faker.helpers.arrayElement(customerIds);
      
      // Willekeurig team (1 tot 3 extra users)
      const team = faker.helpers.arrayElements(userIds, { min: 1, max: 3 });

      await pb.collection('projects').create({
        name: faker.commerce.productName() + ' Project',
        description: faker.lorem.paragraphs(2),
        status: faker.helpers.arrayElement(['Voorstel', 'Geakkoordeerd', 'On Hold', 'Actief', 'Afgerond']),
        owner: ownerId,
        customerId: customerId,
        team: team,
        totalPrice: faker.number.int({ min: 1000, max: 25000 }),
        startDate: faker.date.recent({ days: 30 }).toISOString(),
        endDate: faker.date.future({ years: 1 }).toISOString(),
        isHourlyRateActive: faker.datatype.boolean(),
        hourlyRate: faker.number.int({ min: 75, max: 150 }),
      });
    } catch (err) {
      console.error('Fout bij maken project:', err.message);
    }
  }
  console.log('✅ Projecten aangemaakt.');

  console.log('\n🎉 Seed script voltooid!');
}

run();
