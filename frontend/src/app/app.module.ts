import { RedefinirSenhaComponent } from './redefinir-senha/redefinir-senha.component';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { PacientesComponent } from './pacientes/pacientes.component';
import { LoginComponent } from './auth/login/login.component';
import { RelatoriosComponent } from './relatorios/relatorios.component';
import { UsuariosComponent } from './usuarios/usuarios.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatTableModule } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatMenuModule } from '@angular/material/menu';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { FeedbackDialogComponent } from './shared/feedback-dialog/feedback-dialog.component';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { AuthInterceptor } from './auth/auth.interceptor';
import {
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import { HomeComponent } from './home/home.component';
import { AtendimentosDiaComponent } from './atendimentos-dia/atendimentos-dia.component';
import { RelatorioAtendimentosComponent } from './relatorios/relatorio-atendimentos.component';
import { BreadcrumbComponent } from './shared/breadcrumb/breadcrumb.component';
import { DashboardTriagemComponent } from './triagem/dashboard/dashboard-triagem.component';
import { FilaTriagemComponent } from './triagem/fila-triagem/fila-triagem.component';
import { ClassificacaoDialogComponent } from './classificacao-dialog/classificacao-dialog.component';
import { PaginationComponent } from './shared/components/pagination/pagination.component';
import { NotificationContainerComponent } from './shared/components/notification-container.component';
import { RealtimeStatusComponent } from './shared/components/realtime-status.component';
import { FilaComponent } from './fila/fila.component';
import { DateInputLimiterDirective } from './shared/directives/data.directive';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    RelatoriosComponent,
    UsuariosComponent,
    HomeComponent,
    AtendimentosDiaComponent,
    RedefinirSenhaComponent,
    BreadcrumbComponent,
    DashboardTriagemComponent,
    ClassificacaoDialogComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    RelatorioAtendimentosComponent,
    FilaTriagemComponent,
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
    MatProgressBarModule,
    MatMenuModule,
    MatSidenavModule,
    MatToolbarModule,
    MatCardModule,
    MatSlideToggleModule,
    MatTooltipModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    PaginationComponent,
    NotificationContainerComponent,
    RealtimeStatusComponent,
    FilaComponent,
    DateInputLimiterDirective,

    // Remover diretivas e componentes dos imports, manter apenas módulos
    // Removido CommonModule daqui, pois BrowserModule já inclui CommonModule para AppModule
  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true,
    },
    provideHttpClient(withInterceptorsFromDi()),
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
