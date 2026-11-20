import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'capture',
  },
  {
    path: '**',
    redirectTo: 'capture',
  },
];
