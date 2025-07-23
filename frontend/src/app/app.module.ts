import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { NovoAtendimentoComponent } from './atendimentos-dia/novo-atendimento.component';
import { AppComponent } from './app.component';
import { PacientesComponent } from './pacientes/pacientes.component';
import { PacientesFormComponent } from './pacientes/pacientes-form.component';
import { LoginComponent } from './auth/login/login.component';
import { RelatoriosComponent } from './relatorios/relatorios.component';
import { UsuariosComponent } from './usuarios/usuarios.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatTableModule } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule } from '@angular/material/dialog';
import { FeedbackDialogComponent } from './shared/feedback-dialog.component';
import { CommonModule } from '@angular/common';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { AuthInterceptor } from './auth/auth.interceptor';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HomeComponent } from './home/home.component';
import { RelatorioAtendimentosComponent } from './relatorios/relatorio-atendimentos.component';
import { DateInputLimiterDirective } from './shared/directives/data.directive';
import { AtendimentosDiaComponent } from './atendimentos-dia/atendimentos-dia.component';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';


@NgModule({
  declarations: [
    AppComponent,
    PacientesComponent,
    PacientesFormComponent,
    NovoAtendimentoComponent,
    LoginComponent,
    RelatoriosComponent,
    UsuariosComponent,
    HomeComponent,
    AtendimentosDiaComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatListModule,
    MatIconModule,
    MatSnackBarModule,
    MatDialogModule,
    MatDividerModule,
    MatTableModule,
    MatSelectModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatMenuModule,
    MatCardModule,
    MatTooltipModule,
    CommonModule,
    FormsModule,
    RelatorioAtendimentosComponent,
    NgxMaskDirective,
    DateInputLimiterDirective,
    // Removido CommonModule daqui, pois BrowserModule já inclui CommonModule para AppModule
    MatMenuModule,
  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    },
    provideHttpClient(withInterceptorsFromDi()),
    provideNgxMask()
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
