import { Component } from '@angular/core';
import { Router } from '@angular/router'; // Import Router
import { ReusableButtonComponent } from '../reusable-button/reusable-button.component';

@Component({
  selector: 'app-main-menu',
  standalone: true,
  imports: [ReusableButtonComponent], // Remove RouterLink, keep ReusableButtonComponent
  templateUrl: './main-menu.component.html',
  styleUrls: ['./main-menu.component.scss']
})
export class MainMenuComponent {
  constructor(private router: Router) {} // Inject Router

  navigateToGameBoard() {
    this.router.navigate(['/game-board']);
  }

  navigateToTestPage() {
    this.router.navigate(['/test-page']);
  }
}
