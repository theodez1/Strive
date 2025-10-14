import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Theme, { Colors } from '../constants/Theme';

// Import des écrans
import DiscoverScreen from '../screens/discover/DiscoverScreen';
import EventsScreen from '../screens/events/EventsScreen';
import EventDetailsScreen from '../screens/events/EventDetailsScreen';
import RequestToJoinScreen from '../screens/events/RequestToJoinScreen';
import EventAdminScreen from '../screens/events/EventAdminScreen';
import EventEditScreen from '../screens/events/EventEditScreen';
import EventParticipantsScreen from '../screens/events/EventParticipantsScreen';
import EventRequestsScreen from '../screens/events/EventRequestsScreen';
import MyEventsScreen from '../screens/events/MyEventsScreen';
import RateParticipantsScreen from '../screens/events/RateParticipantsScreen';
import CreerEventScreen from '../screens/create/CreateEventScreen';
import CreateStep2 from '../screens/create/CreateStep2';
import CreateStep3 from '../screens/create/CreateStep3';
import CreateStep4 from '../screens/create/CreateStep4';
import CreateStep5 from '../screens/create/CreateStep5';
import CreateStep6 from '../screens/create/CreateStep6';
import CreateStep7 from '../screens/create/CreateStep7';
import MessagesScreen from '../screens/messages/MessagesScreen';
import ChatScreen from '../screens/messages/ChatScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';
import LocationScreen from '../screens/location/LocationScreen';
import ReviewsScreen from '../screens/profile/ReviewsScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function TabNavigator() {
  const insets = useSafeAreaInsets();
  
  return (
    <Tab.Navigator
        screenOptions={{
          tabBarStyle: {
            backgroundColor: Colors.background,
            borderTopColor: Colors.textSecondary,
            borderTopWidth: 1,
            paddingTop: Theme.spacing.xs,
            paddingBottom: insets.bottom + Theme.spacing.xs,
            height: 60 + insets.bottom,
          },
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: Colors.textSecondary,
          tabBarLabelStyle: {
            fontSize: Theme.typography.fontSize.xs,
            fontWeight: '500',
            marginTop: Theme.spacing.xs,
          },
          headerStyle: {
            backgroundColor: Colors.background,
            borderBottomColor: Colors.textSecondary,
            borderBottomWidth: 1,
          },
          headerTitleStyle: {
            fontSize: Theme.typography.fontSize.lg,
            fontWeight: 'bold',
            color: Colors.text,
          },
          headerTintColor: Colors.primary,
        }}
      >
        <Tab.Screen
          name="Discover"
          component={DiscoverScreen}
          options={{
            title: 'Découvrir',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="compass-outline" size={24} color={color} />
            ),
            headerShown: false,
          }}
        />
        
        <Tab.Screen
          name="Events"
          component={EventsScreen}
          options={{
            title: 'Événements',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="calendar-outline" size={24} color={color} />
            ),
            headerShown: false,
          }}
        />
        
        <Tab.Screen
          name="Create"
          component={CreerEventScreen}
          options={{
            title: 'Créer',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="add-circle-outline" size={24} color={color} />
            ),
            headerShown: false,
          }}
        />
        
        <Tab.Screen
          name="Messages"
          component={MessagesScreen}
          options={{
            title: 'Messages',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="chatbubble-outline" size={24} color={color} />
            ),
            headerShown: false,
          }}
        />
        
        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{
            title: 'Profil',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person-circle-outline" size={24} color={color} />
            ),
            headerShown: false,
          }}
        />
      </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: Colors.background,
            borderBottomColor: Colors.textSecondary,
            borderBottomWidth: 1,
          },
          headerTitleStyle: {
            fontSize: Theme.typography.fontSize.lg,
            fontWeight: 'bold',
            color: Colors.text,
          },
          headerTintColor: Colors.primary,
        }}
      >
        <Stack.Screen
          name="Main"
          component={TabNavigator}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Location"
          component={LocationScreen}
          options={{
            title: 'Localisation',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="EventDetails"
          component={EventDetailsScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="RequestToJoin"
          component={RequestToJoinScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="EventAdmin"
          component={EventAdminScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="EventEdit"
          component={EventEditScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="EventParticipants"
          component={EventParticipantsScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="EventRequests"
          component={EventRequestsScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="MyEvents"
          component={MyEventsScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="RateParticipants"
          component={RateParticipantsScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="Reviews"
          component={ReviewsScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="CreerEvent"
          component={CreerEventScreen}
          options={{
            headerShown: false,
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="CreateStep2"
          component={CreateStep2}
          options={{
            headerShown: false,
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="CreateStep3"
          component={CreateStep3}
          options={{
            headerShown: false,
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="CreateStep4"
          component={CreateStep4}
          options={{
            headerShown: false,
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="CreateStep5"
          component={CreateStep5}
          options={{
            headerShown: false,
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="CreateStep6"
          component={CreateStep6}
          options={{
            headerShown: false,
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="CreateStep7"
          component={CreateStep7}
          options={{
            headerShown: false,
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="EditProfile"
          component={EditProfileScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="Chat"
          component={ChatScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="Notifications"
          component={NotificationsScreen}
          options={{
            headerShown: false,
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

