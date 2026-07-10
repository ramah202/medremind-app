//(app)/medications/_layout
import { Stack } from 'expo-router';

export default function MedicationsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#2196F3',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <Stack.Screen
        name="add"
        options={{
          title: 'Add Medication',
          presentation: 'modal', // Makes it slide up from bottom
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: 'Medication Details',
        }}
      />
    </Stack>
  );
}