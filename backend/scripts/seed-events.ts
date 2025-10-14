import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const sports = [
  'Football', 'Basketball', 'Tennis', 'Running', 'Cycling', 
  'Swimming', 'Volleyball', 'Badminton', 'Ping Pong', 'Fitness'
];

const levels = [
  ['Beginner'],
  ['Intermediate'],
  ['Advanced'],
  ['Beginner', 'Intermediate'],
  ['Intermediate', 'Advanced'],
  ['Beginner', 'Intermediate', 'Advanced']
];

const cities = [
  { name: 'Paris', lat: 48.8566, lng: 2.3522 },
  { name: 'Lyon', lat: 45.7640, lng: 4.8357 },
  { name: 'Marseille', lat: 43.2965, lng: 5.3698 },
  { name: 'Toulouse', lat: 43.6047, lng: 1.4442 },
  { name: 'Nice', lat: 43.7102, lng: 7.2620 },
  { name: 'Nantes', lat: 47.2184, lng: -1.5536 },
  { name: 'Strasbourg', lat: 48.5734, lng: 7.7521 },
  { name: 'Montpellier', lat: 43.6110, lng: 3.8767 }
];

const eventNames = [
  'Match de football amical',
  'Tournoi de basketball',
  'Partie de tennis',
  'Course à pied matinale',
  'Sortie vélo en groupe',
  'Séance de natation',
  'Match de volley',
  'Tournoi de badminton',
  'Partie de ping-pong',
  'Séance fitness',
  'Football entre amis',
  'Basketball en extérieur',
  'Tennis en double',
  'Running au parc',
  'Cyclisme urbain',
  'Nage en piscine',
  'Volley sur plage',
  'Badminton en salle',
  'Ping-pong rapide',
  'Fitness en groupe'
];

const locations = [
  'Stade municipal',
  'Complexe sportif',
  'Parc public',
  'Salle de sport',
  'Piscine municipale',
  'Terrain de football',
  'Court de tennis',
  'Salle de basket',
  'Piste cyclable',
  'Plage',
  'Gymnase',
  'Centre sportif',
  'Stade omnisports',
  'Parc des sports',
  'Complexe aquatique'
];

// Générer des dates futures et passées
function generateDates() {
  const now = new Date();
  const dates = [];
  
  // Événements passés (derniers 30 jours)
  for (let i = 1; i <= 15; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    date.setHours(9 + Math.floor(Math.random() * 12), Math.floor(Math.random() * 60), 0, 0);
    dates.push(date);
  }
  
  // Événements futurs (prochains 60 jours)
  for (let i = 1; i <= 30; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() + i);
    date.setHours(9 + Math.floor(Math.random() * 12), Math.floor(Math.random() * 60), 0, 0);
    dates.push(date);
  }
  
  return dates;
}

async function seedEvents() {
  try {
    console.log('🌱 Début du seeding des événements...');

    // Créer des utilisateurs de test s'ils n'existent pas
    const testUsers = await Promise.all([
      prisma.user.upsert({
        where: { email: 'organizer1@test.com' },
        update: {},
        create: {
          email: 'organizer1@test.com',
          firstName: 'Jean',
          lastName: 'Dupont',
          username: 'jean_dupont',
          password: 'hashed_password_123'
        }
      }),
      prisma.user.upsert({
        where: { email: 'organizer2@test.com' },
        update: {},
        create: {
          email: 'organizer2@test.com',
          firstName: 'Marie',
          lastName: 'Martin',
          username: 'marie_martin',
          password: 'hashed_password_123'
        }
      }),
      prisma.user.upsert({
        where: { email: 'organizer3@test.com' },
        update: {},
        create: {
          email: 'organizer3@test.com',
          firstName: 'Pierre',
          lastName: 'Durand',
          username: 'pierre_durand',
          password: 'hashed_password_123'
        }
      })
    ]);

    console.log(`✅ ${testUsers.length} utilisateurs de test créés`);

    // Supprimer les événements existants
    await prisma.event.deleteMany({});
    console.log('🗑️  Anciens événements supprimés');

    const dates = generateDates();
    const events = [];

    // Créer 45 événements
    for (let i = 0; i < 45; i++) {
      const city = cities[Math.floor(Math.random() * cities.length)];
      const sport = sports[Math.floor(Math.random() * sports.length)];
      const level = levels[Math.floor(Math.random() * levels.length)];
      const organizer = testUsers[Math.floor(Math.random() * testUsers.length)];
      const eventName = eventNames[Math.floor(Math.random() * eventNames.length)];
      const location = locations[Math.floor(Math.random() * locations.length)];
      const date = dates[Math.floor(Math.random() * dates.length)];
      
      // Générer des coordonnées aléatoires autour de la ville (±0.05 degrés)
      const lat = city.lat + (Math.random() - 0.5) * 0.1;
      const lng = city.lng + (Math.random() - 0.5) * 0.1;
      
      const totalSlots = 6 + Math.floor(Math.random() * 14); // 6-20 places
      const availableSlots = Math.floor(Math.random() * (totalSlots + 1));
      
      const event = {
        name: `${eventName} - ${city.name}`,
        sport: sport as any,
        locationName: `${location} ${city.name}`,
        locationAddress: `${Math.floor(Math.random() * 200) + 1} rue du Sport, ${city.name}`,
        locationCity: city.name,
        locationCountry: 'France',
        latitude: lat,
        longitude: lng,
        dateTime: date,
        duration: 60 + Math.floor(Math.random() * 120), // 1h à 3h
        totalSlots,
        availableSlots,
        organizerId: organizer.id,
        organizerSlots: 1,
        description: `Venez participer à un ${eventName.toLowerCase()} à ${city.name}. Niveau requis: ${level.join(', ')}.`,
        price: Math.random() < 0.7 ? Math.floor(Math.random() * 20) : null, // 70% payants, 30% gratuits
        levels: level as any[]
      };

      events.push(event);
    }

    // Insérer tous les événements
    await prisma.event.createMany({
      data: events
    });

    console.log(`✅ ${events.length} événements créés`);

    // Créer quelques participants pour les événements
    const allEvents = await prisma.event.findMany();
    const participants = [];
    
    for (let i = 0; i < 20; i++) {
      const event = allEvents[Math.floor(Math.random() * allEvents.length)];
      const user = testUsers[Math.floor(Math.random() * testUsers.length)];
      
      // Éviter que l'organisateur soit participant de son propre événement
      if (event.organizerId !== user.id) {
        participants.push({
          eventId: event.id,
          userId: user.id,
          status: 'confirmed' as any,
          joinedAt: new Date()
        });
      }
    }

    if (participants.length > 0) {
      await prisma.eventParticipant.createMany({
        data: participants
      });
      console.log(`✅ ${participants.length} participants créés`);
    }

    // Statistiques finales
    const eventCount = await prisma.event.count();
    const userCount = await prisma.user.count();
    const participantCount = await prisma.eventParticipant.count();

    console.log('\n📊 Statistiques finales:');
    console.log(`👥 Utilisateurs: ${userCount}`);
    console.log(`🏃 Événements: ${eventCount}`);
    console.log(`🤝 Participants: ${participantCount}`);

    console.log('\n🎉 Seeding terminé avec succès !');

  } catch (error) {
    console.error('❌ Erreur lors du seeding:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter le seeding
seedEvents()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
