import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common'; // For ngClass

@Component({
  selector: 'app-reusable-button',
  standalone: true,
  imports: [CommonModule], // CommonModule is needed for ngClass
  templateUrl: './reusable-button.component.html',
  styleUrls: ['./reusable-button.component.scss']
})
export class ReusableButtonComponent {
  @Input() label: string = 'Button';
  @Input() buttonType: 'spawn' | 'delete' | 'default' | 'nav' = 'default';
  @Input() disabled: boolean = false; // New input
  @Output() onClick = new EventEmitter<MouseEvent>();

  onButtonClicked(event: MouseEvent) {
    this.onClick.emit(event);
  }

  // Helper to get CSS classes based on buttonType
  get buttonClasses() {
    return {
      'btn': true,
      [`btn-${this.buttonType}`]: true
    };
  }
}
