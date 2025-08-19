import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-classificacao-dialog',
  standalone: false,
  templateUrl: './classificacao-dialog.component.html',
  styleUrl: './classificacao-dialog.component.scss'
})
export class ClassificacaoDialogComponent implements OnInit {
constructor(private dialogRef: MatDialogRef<ClassificacaoDialogComponent>) {}

  fechar() {
    this.dialogRef.close();
  }

  ngOnInit() {
  console.log('ClassificacaoDialogComponent carregado!');
}
}
