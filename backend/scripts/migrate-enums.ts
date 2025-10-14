import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateEnums() {
  console.log('🔄 Migration des enums vers la nouvelle casse...');

  try {
    // Mettre à jour les sports
    const sportMappings: Record<string, string> = {
      'football': 'Football',
      'basketball': 'Basketball',
      'tennis': 'Tennis',
      'volleyball': 'Volleyball',
      'badminton': 'Badminton',
      'ping_pong': 'Ping_pong',
      'swimming': 'Swimming',
      'running': 'Running',
      'cycling': 'Cycling',
      'climbing': 'Climbing',
      'hiking': 'Hiking',
      'surfing': 'Surfing',
      'skiing': 'Skiing',
      'snowboarding': 'Snowboarding',
      'padel': 'Padel',
      'other': 'Other'
    };

    const levelMappings: Record<string, string> = {
      'beginner': 'Beginner',
      'intermediate': 'Intermediate',
      'advanced': 'Advanced',
      'all': 'All'
    };

    // Mettre à jour les événements
    const events = await prisma.event.findMany();
    console.log(`📅 ${events.length} événements à migrer`);

    for (const event of events) {
      const newSport = sportMappings[event.sport.toLowerCase()] || event.sport;
      const newLevels = event.levels.map(level => 
        levelMappings[level.toLowerCase()] || level
      );

      await prisma.event.update({
        where: { id: event.id },
        data: {
          sport: newSport as any,
          levels: newLevels as any
        }
      });

      console.log(`✅ Événement ${event.name}: ${event.sport} → ${newSport}`);
    }

    console.log('🎉 Migration terminée !');
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrateEnums();
