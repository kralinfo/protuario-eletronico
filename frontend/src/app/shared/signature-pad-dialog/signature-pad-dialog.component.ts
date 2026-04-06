import { Component, ViewChild, ElementRef, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-signature-pad-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="signature-dialog">
      <h2>Assinatura do Profissional</h2>
      <p>Assine no espaço abaixo</p>
      
      <canvas 
        #signaturePad 
        class="signature-canvas"
        (mousedown)="startSigning($event)"
        (mousemove)="sign($event)"
        (mouseup)="stopSigning($event)"
        (mouseleave)="stopSigning($event)"
        (touchstart)="startSigning($event)"
        (touchmove)="sign($event)"
        (touchend)="stopSigning($event)"
      ></canvas>

      <div class="button-group">
        <button class="btn-clear" (click)="clearSignature()">Limpar</button>
        <button class="btn-cancel" (click)="cancel()">Cancelar</button>
        <button class="btn-confirm" (click)="confirm()" [disabled]="!isSignatureDirty">Confirmar</button>
      </div>
    </div>
  `,
  styles: [`
    .signature-dialog {
      padding: 20px;
      min-width: 500px;
      background: #fff;
    }

    h2 {
      margin: 0 0 10px 0;
      font-size: 18px;
      color: #333;
    }

    p {
      margin: 0 0 20px 0;
      color: #666;
      font-size: 14px;
    }

    .signature-canvas {
      border: 2px solid #ddd;
      border-radius: 4px;
      cursor: crosshair;
      display: block;
      background: #fff;
      margin-bottom: 20px;
      width: 100%;
      height: 200px;
    }

    .button-group {
      display: flex;
      gap: 10px;
      justify-content: flex-end;
    }

    button {
      padding: 10px 20px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.3s ease;
    }

    .btn-clear {
      background: #f0f0f0;
      color: #333;
    }

    .btn-clear:hover {
      background: #e0e0e0;
    }

    .btn-cancel {
      background: #fff;
      color: #666;
      border: 1px solid #ddd;
    }

    .btn-cancel:hover {
      background: #f5f5f5;
    }

    .btn-confirm {
      background: #4CAF50;
      color: white;
    }

    .btn-confirm:hover:not(:disabled) {
      background: #45a049;
    }

    .btn-confirm:disabled {
      background: #ccc;
      cursor: not-allowed;
    }
  `]
})
export class SignaturePadDialogComponent implements OnInit {
  @ViewChild('signaturePad', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;

  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private isDrawing = false;
  isSignatureDirty = false;

  constructor(public dialogRef: MatDialogRef<SignaturePadDialogComponent>) {}

  ngOnInit() {
    setTimeout(() => {
      this.initCanvas();
    }, 100);
  }

  private initCanvas() {
    this.canvas = this.canvasRef.nativeElement;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;

    this.ctx = ctx;

    // Set canvas size considering DPI
    const rect = this.canvas.getBoundingClientRect();
    const dpi = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpi;
    this.canvas.height = rect.height * dpi;
    this.ctx.scale(dpi, dpi);

    // Set styles
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.lineWidth = 2;
    this.ctx.strokeStyle = '#000';
  }

  startSigning(event: MouseEvent | TouchEvent) {
    this.isDrawing = true;
    const point = this.getCoordinates(event);
    this.ctx.beginPath();
    this.ctx.moveTo(point.x, point.y);
    event.preventDefault();
  }

  sign(event: MouseEvent | TouchEvent) {
    if (!this.isDrawing) return;
    const point = this.getCoordinates(event);
    this.ctx.lineTo(point.x, point.y);
    this.ctx.stroke();
    this.isSignatureDirty = true;
    event.preventDefault();
  }

  stopSigning(event: MouseEvent | TouchEvent) {
    this.isDrawing = false;
    this.ctx.closePath();
    event.preventDefault();
  }

  private getCoordinates(event: MouseEvent | TouchEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    let x: number;
    let y: number;

    if (event instanceof TouchEvent) {
      x = event.touches[0].clientX - rect.left;
      y = event.touches[0].clientY - rect.top;
    } else {
      x = event.clientX - rect.left;
      y = event.clientY - rect.top;
    }

    return { x, y };
  }

  clearSignature() {
    const rect = this.canvas.getBoundingClientRect();
    const dpi = window.devicePixelRatio || 1;
    this.ctx.clearRect(0, 0, rect.width, rect.height * dpi);
    this.isSignatureDirty = false;
  }

  cancel() {
    this.dialogRef.close(null);
  }

  confirm() {
    if (!this.isSignatureDirty) return;
    const signatureData = this.canvas.toDataURL('image/png');
    this.dialogRef.close(signatureData);
  }
}
