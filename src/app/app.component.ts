import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router'; // Ensure RouterOutlet is imported

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet], // Ensure RouterOutlet is in imports
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  // All PixiJS-related properties and methods have been removed.
  // AppComponent is now a simple shell for routing.
}
