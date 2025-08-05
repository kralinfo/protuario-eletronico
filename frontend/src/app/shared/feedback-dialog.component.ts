import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-feedback-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [ngClass]="data.type">
      <h2 mat-dialog-title>{{ data.title }}</h2>
      <div mat-dialog-content>{{ data.message }}</div>
    </div>
  `,
  styles: [`
    .success {
      background: #e8f5e9;
      color: #388e3c;
    }
    .error {
      background: #ffebee;
      color: #d32f2f;
    }
    .warning {
      background: #fff8e1;
      color: #f57c00;
    }
    div {
      padding: 24px 16px;
      text-align: center;
      font-size: 1.1em;
    }
  `]
})
export class FeedbackDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<FeedbackDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { title: string; message: string; type: 'success' | 'error' | 'warning' }
  ) {}
}
