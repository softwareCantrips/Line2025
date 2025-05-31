import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: '/main-menu', pathMatch: 'full' }, // Default route
  {
    path: 'main-menu',
    loadComponent: () => import('./main-menu/main-menu.component').then(m => m.MainMenuComponent)
  },
  {
    path: 'game-board',
    loadComponent: () => import('./game-board/game-board.component').then(m => m.GameBoardComponent)
  },
  {
    path: 'test-page',
    loadComponent: () => import('./test-page/test-page.component').then(m => m.TestPageComponent)
  },
  // Optional: A wildcard route for 404s, can be added later
  // { path: '**', redirectTo: '/main-menu' }
];
