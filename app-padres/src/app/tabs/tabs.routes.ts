import { Routes } from '@angular/router';
import { TabsPage } from './tabs.page';

export const routes: Routes = [
  {
    path: '',
    component: TabsPage,
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('../pages/dashboard/dashboard.page').then(
            (m) => m.DashboardPage
          ),
      },
      {
        path: 'dashboard/child/:id',
        loadComponent: () =>
          import('../pages/child-profile/child-profile.page').then(
            (m) => m.ChildProfilePage
          ),
      },
      {
        path: 'activity',
        loadComponent: () =>
          import('../pages/activity/activity.page').then(
            (m) => m.ActivityPage
          ),
      },
      {
        path: 'activity/:id',
        loadComponent: () =>
          import('../pages/activity/activity.page').then(
            (m) => m.ActivityPage
          ),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('../pages/profile/profile.page').then(
            (m) => m.ProfilePage
          ),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('../pages/settings/settings.page').then(m => m.SettingsPage),
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'notifications',
        loadComponent: () =>
          import('../components/notifications-history/notifications-history.component')
            .then((m) => m.NotificationsHistoryComponent),
      },
    ],
  },
];
