import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkProfilePictures() {
  try {
    console.log('🔍 Vérification des photos de profil des utilisateurs...\n');

    // Récupérer tous les utilisateurs avec leurs événements
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        profilePictureUrl: true,
        organizedEvents: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    console.log(`📊 Total des utilisateurs: ${users.length}\n`);

    let usersWithPictures = 0;
    let usersWithoutPictures = 0;
    let usersWithEvents = 0;

    users.forEach(user => {
      const hasPicture = user.profilePictureUrl && user.profilePictureUrl.trim() !== '';
      const hasEvents = user.organizedEvents.length > 0;

      if (hasPicture) {
        usersWithPictures++;
        console.log(`✅ ${user.username} (${user.firstName} ${user.lastName}) - Photo: ${user.profilePictureUrl}`);
      } else {
        usersWithoutPictures++;
        console.log(`❌ ${user.username} (${user.firstName} ${user.lastName}) - Pas de photo`);
      }

      if (hasEvents) {
        usersWithEvents++;
        console.log(`   📅 Événements organisés: ${user.organizedEvents.length}`);
        user.organizedEvents.forEach(event => {
          console.log(`      - ${event.name}`);
        });
      }
    });

    console.log('\n📈 Statistiques:');
    console.log(`- Utilisateurs avec photos: ${usersWithPictures}`);
    console.log(`- Utilisateurs sans photos: ${usersWithoutPictures}`);
    console.log(`- Utilisateurs avec événements: ${usersWithEvents}`);

    // Vérifier spécifiquement les organisateurs d'événements
    const eventsWithOrganizers = await prisma.event.findMany({
      include: {
        organizer: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            profilePictureUrl: true,
          },
        },
      },
      take: 5, // Juste les 5 premiers pour debug
    });

    console.log('\n🎯 Organisateurs d\'événements récents:');
    eventsWithOrganizers.forEach(event => {
      const organizer = event.organizer;
      const hasPicture = organizer?.profilePictureUrl && organizer.profilePictureUrl.trim() !== '';
      console.log(`📅 "${event.name}"`);
      console.log(`   👤 Organisateur: ${organizer?.firstName} ${organizer?.lastName} (${organizer?.username})`);
      console.log(`   🖼️  Photo: ${hasPicture ? organizer?.profilePictureUrl : 'AUCUNE'}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkProfilePictures();
