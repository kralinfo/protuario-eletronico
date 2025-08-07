import { Component, OnInit } from '@angular/core';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  // styleUrls removido
  standalone: false
})
export class HomeComponent implements OnInit {
  selectedModule: string | null = null;

  constructor(private authService: AuthService) {}

  ngOnInit() {
    this.selectedModule = this.authService.getSelectedModule();
  }

  isTriagemModule(): boolean {
    return this.selectedModule === 'triagem';
  }

  isRecepcaoModule(): boolean {
    return this.selectedModule === 'recepcao';
  }
}
