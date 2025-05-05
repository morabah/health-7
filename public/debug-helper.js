// Debug Helper for Health Appointment System
// Usage: Just open browser console and type: fetch('/debug-helper.js').then(r => r.text()).then(eval)

console.log('🔍 Debug Helper loaded!');

// 1. Function to check auth state
function checkAuth() {
  const authContext = window.__authContext;
  console.log(
    'Auth state:',
    authContext
      ? {
          user: authContext.user,
          isLoading: authContext.loading,
          error: authContext.error,
          hasProfile: !!authContext.profile,
        }
      : 'No auth context found'
  );
  return !!authContext?.user;
}

// 2. Function to fetch appointments directly
async function fetchAppointments() {
  try {
    const user = window.__authContext?.user;
    if (!user) {
      console.log('❌ Not logged in');
      return;
    }

    console.log('🔄 Fetching appointments directly...');
    const response = await fetch('/api/localDb?collection=appointments');
    const allAppointments = await response.json();

    console.log(`Found ${allAppointments.length} total appointments`);

    // Filter for current user
    const myAppointments = allAppointments.filter(a => a.patientId === user.uid);
    console.log(`Found ${myAppointments.length} appointments for user ${user.uid}`);

    // Check for upcoming appointments
    const now = new Date();
    const upcomingAppointments = myAppointments.filter(
      a =>
        ['pending', 'confirmed', 'rescheduled'].includes(a.status.toLowerCase()) &&
        new Date(a.appointmentDate) >= now
    );
    console.log(`Found ${upcomingAppointments.length} upcoming appointments`);
    console.log('Upcoming appointments:', upcomingAppointments);

    return { all: allAppointments, my: myAppointments, upcoming: upcomingAppointments };
  } catch (error) {
    console.error('❌ Error fetching appointments:', error);
  }
}

// 3. Function to debug filterAppointments logic
function debugFilter() {
  // Try to find the filter function in React components
  console.log('🔍 Looking for appointments data in React components...');
  const appointmentData = checkAppointmentsData();
  if (!appointmentData) {
    console.log('❌ Could not find appointments data in React');
    return;
  }
}

// 4. Function to check appointments data in React
function checkAppointmentsData() {
  try {
    const appointments = window.__NEXT_DATA__?.props?.pageProps?.appointments;
    if (appointments) {
      console.log('Found appointments in __NEXT_DATA__:', appointments);
      return appointments;
    }

    // Try to find in React fiber
    const allApptEls = document.querySelectorAll('*');
    for (const el of allApptEls) {
      const key = Object.keys(el).find(
        key => key.startsWith('__reactFiber$') || key.startsWith('__reactInternalInstance$')
      );
      if (key) {
        let fiber = el[key];
        while (fiber) {
          if (fiber.memoizedProps && fiber.memoizedProps.appointments) {
            console.log('Found appointments data:', fiber.memoizedProps.appointments);
            return fiber.memoizedProps.appointments;
          }
          if (fiber.memoizedState && fiber.memoizedState.appointmentsData) {
            console.log('Found appointments data in state:', fiber.memoizedState.appointmentsData);
            return fiber.memoizedState.appointmentsData;
          }
          fiber = fiber.return;
        }
      }
    }

    console.log('❌ Could not find appointments data in React components');
    return null;
  } catch (error) {
    console.error('❌ Error checking appointments data:', error);
    return null;
  }
}

// 5. Force refresh appointments data and component
async function forceRefresh() {
  try {
    console.log('🔄 Forcing refresh of appointments data...');

    // Clear cache
    caches.keys().then(cacheNames => {
      cacheNames.forEach(cacheName => {
        caches.delete(cacheName);
      });
    });

    // Clear memory cache if function exists
    if (typeof window.clearMemoryCache === 'function') {
      window.clearMemoryCache();
    }

    // Invalidate any react-query cache
    if (window.__REACT_QUERY_GLOBAL_CLIENT__) {
      window.__REACT_QUERY_GLOBAL_CLIENT__.invalidateQueries(['patientAppointments']);
      console.log('✅ Invalidated React Query cache');
    }

    // Refresh the page
    console.log('🔄 Refreshing page in 2 seconds...');
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  } catch (error) {
    console.error('❌ Error forcing refresh:', error);
  }
}

// Export debug commands
window.debugAppointments = {
  checkAuth,
  fetchAppointments,
  debugFilter,
  checkAppointmentsData,
  forceRefresh,
  runAll: async () => {
    console.log('🔍 Running full diagnostics...');
    checkAuth();
    await fetchAppointments();
    debugFilter();
  },
};

console.log('✅ Debug Helper ready! Run window.debugAppointments.runAll() to debug appointments');
