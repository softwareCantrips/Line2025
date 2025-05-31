import { Component } from '@angular/core';
import { Router } from '@angular/router'; // Import Router
import { ReusableButtonComponent } from '../../reusable-button/reusable-button.component';

@Component({
  selector: 'app-test-page',
  standalone: true,
  imports: [ReusableButtonComponent], // Remove RouterLink, keep ReusableButtonComponent
  templateUrl: './test-page.component.html',
  styleUrls: ['./test-page.component.scss']
})
export class TestPageComponent {
  constructor(private router: Router) {} // Inject Router

  navigateToMainMenu() {
    this.router.navigate(['/']); // Navigate to default route (main-menu)
  }
}
