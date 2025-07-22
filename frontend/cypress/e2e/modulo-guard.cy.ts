// Testes E2E para ModuloGuard: acesso visual às rotas conforme módulo selecionado

describe('ModuloGuard - Controle de acesso por módulo', () => {
  beforeEach(() => {
    cy.visit('/login');
  });

  function loginComo(email: string, senha: string, modulo: string) {
    cy.wait(2000); // Evita rate limit do backend
    cy.get('input[formcontrolname="email"]').type(email).blur();
    cy.get('input[formcontrolname="senha"]').type(senha);
    cy.get('select[formcontrolname="modulo"]').then($select => {
      if ($select.is(':disabled')) {
        cy.get('button[type="submit"]').click();
      } else {
        cy.wrap($select).should('not.be.disabled').select(modulo);
        cy.get('button[type="submit"]').click();
      }
    });
  }

  it('deve acessar todas as telas quando logado como recepcao', () => {
    loginComo('fpsjunior87@gmail.com', '123456', 'recepcao');
    cy.url().should('not.include', '/login');
    // Testa acesso a várias rotas protegidas
    cy.visit('/pacientes');
    cy.url().should('include', '/pacientes');
    cy.visit('/usuarios');
    cy.url().should('include', '/usuarios');
    cy.visit('/atendimentos');
    cy.url().should('include', '/atendimentos');
  });

  it('deve acessar apenas a tela do módulo selecionado', () => {
    loginComo('fpsjunior87@gmail.com', '123456', 'pacientes');
    cy.url().should('not.include', '/login');
    cy.visit('/pacientes');
    cy.url().should('include', '/pacientes');
    cy.visit('/usuarios');
    cy.url().should('not.include', '/usuarios');
    cy.url().should('not.include', '/login');
  });

  it('deve redirecionar para login se não autenticado', () => {
    cy.visit('/pacientes');
    cy.url().should('include', '/login');
  });
});
