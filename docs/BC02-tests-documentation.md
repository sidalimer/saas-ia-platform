# BC02 — Tests et Documentation Technique

## 1. Stratégie de tests

### Pyramide des tests

```
         ╱╲
        ╱E2E╲          ← Peu nombreux, coûteux (Playwright)
       ╱──────╲
      ╱Intégra-╲        ← Endpoints réels, DB, services
     ╱  tion    ╲
    ╱────────────╲
   ╱  Unitaires   ╲     ← Nombreux, rapides (Vitest)
  ╱────────────────╲
```

### Couverture visée : > 80% par service

| Service | Outil | Types de tests | Couverture cible |
|---|---|---|---|
| auth-service | Vitest | Unitaires + intégration mocks | 85% |
| db-service | Vitest | CRUD Prisma mocks | 80% |
| ai-service | Vitest | Logic + mock Gemini | 80% |
| payment-service | Vitest | Checkout, webhook, calculs | 82% |
| notification-service | Vitest | Templates, SMS, push | 80% |
| frontend | Vitest + RTL | Composants React | 75% |

### Outils choisis et justifiés

| Outil | Usage | Justification |
|---|---|---|
| **Vitest** | Tests unitaires TypeScript | Compatible natif ESM, très rapide, API Jest-compatible |
| **vi.fn()** | Mocking fetch/DB | Isolation totale des dépendances externes |
| **Playwright** | E2E (à implémenter) | Headless browser, intégration CI/CD |
| **GitHub Actions** | CI pipeline | Intégration native GitHub, gratuit |
| **npm audit** | Sécurité | Détection CVE automatique |

### Politique de tests avant merge (PR)

1. `npm run test --workspaces` doit passer à 100%
2. Couverture de code > 80% obligatoire
3. `npm audit` — zéro vulnérabilité critique
4. TypeScript `tsc --noEmit` sans erreur
5. Revue de code par un pair

---

## 2. Tests unitaires par service

### Auth Service — Cas testés

| ID | Cas de test | Résultat attendu |
|---|---|---|
| AUTH-U-01 | Hash bcrypt du mot de passe | Hash ≠ plaintext, longueur 60 chars |
| AUTH-U-02 | Génération JWT access token | Token valide, expire en 15m |
| AUTH-U-03 | Génération JWT refresh token | Token valide, expire en 7j |
| AUTH-U-04 | Vérification JWT valide | Payload décodé correctement |
| AUTH-U-05 | Vérification JWT expiré | Erreur TokenExpiredError |
| AUTH-U-06 | Génération code reset 6 chiffres | Code entre 100000 et 999999 |
| AUTH-U-07 | Code reset expire après 1h | Date expiry > now + 59min |
| AUTH-U-08 | OAuth URL construction Google | Contient client_id, scope, redirect_uri |
| AUTH-U-09 | OAuth URL construction GitHub | Contient scope read:user |
| AUTH-U-10 | OAuth URL construction Discord | Contient scope identify email |

### AI Service — Cas testés

| ID | Cas de test | Résultat attendu |
|---|---|---|
| AI-U-01 | Response mock contient [MOCK] | Préfixe [MOCK] présent |
| AI-U-02 | URL Gemini correctement construite | Contient v1beta, model, key |
| AI-U-03 | Fallback sur mock si 429 | Response contient [MOCK] |
| AI-U-04 | tokensUsed ≥ 0 | Entier non négatif |
| AI-U-05 | durationMs ≥ 0 | Entier non négatif |
| AI-U-06 | Schema validation prompt vide | Erreur 400 retournée |
| AI-U-07 | Schema validation userId manquant | Erreur 400 retournée |
| AI-U-08 | GET /models retourne array | Array avec champs id, name, provider |
| AI-U-09 | GET /history/:userId retourne array | Array (vide ou rempli) |

### Payment Service — Cas testés

| ID | Cas de test | Résultat attendu |
|---|---|---|
| PAY-U-01 | Mock checkout retourne paymentId | paymentId défini, success: true |
| PAY-U-02 | Checkout sans planId → 400 | error défini |
| PAY-U-03 | Plan inconnu → 404 | error défini |
| PAY-U-04 | MONTHLY = 30 jours | diffDays = 30 |
| PAY-U-05 | YEARLY = 365 jours | diffDays = 365 |
| PAY-U-06 | Conversion cents → euros | 1499 → "14.99" |
| PAY-U-07 | Prix annuel < 12× mensuel | Réduction appliquée |
| PAY-U-08 | Webhook payment.succeeded → received: true | received = true |
| PAY-U-09 | Webhook payload invalide → 400 | error défini |
| PAY-U-10 | Historique paiements → array | Array retourné |

### Notification Service — Cas testés

| ID | Cas de test | Résultat attendu |
|---|---|---|
| NOTIF-U-01 | Email direct envoyé | message = "Email sent" |
| NOTIF-U-02 | Email invalide → 400 | error défini |
| NOTIF-U-03 | Template welcome | message = "Template email sent" |
| NOTIF-U-04 | Template password-reset-code | Code 6 chiffres dans HTML |
| NOTIF-U-05 | Template email-verification | Lien verify dans HTML |
| NOTIF-U-06 | Template payment-receipt | Montant en euros affiché |
| NOTIF-U-07 | Template subscription-start | Date renouvellement affiché |
| NOTIF-U-08 | Template subscription-end | Date expiration affiché |
| NOTIF-U-09 | Template subscription-cancel | Message annulation |
| NOTIF-U-10 | Template payment-failed | Lien mise à jour paiement |
| NOTIF-U-11 | Template inconnu → 400 | error défini |
| NOTIF-U-12 | SMS mock mode → mode: "mock" | mode = "mock" |
| NOTIF-U-13 | SMS body > 160 chars → 400 | error défini |
| NOTIF-U-14 | Push notification mock | mode = "mock" |
| NOTIF-U-15 | Code 6 chiffres toujours valide | Entre 100000 et 999999 |

---

## 3. Cahier de recettes

### Format de test

| Champ | Description |
|---|---|
| ID | Identifiant unique (REC-SERVICE-NNN) |
| Fonctionnalité | Nom de la fonctionnalité testée |
| Préconditions | État initial requis |
| Étapes | Actions à réaliser |
| Résultat attendu | Comportement nominal |
| Résultat obtenu | À remplir lors de l'exécution |
| Statut | ✅ Passé / ❌ Échec / ⚠️ Bloqué |

---

### Service Auth — Recettes

#### REC-AUTH-001 : Inscription avec email
| Champ | Valeur |
|---|---|
| Préconditions | Aucun compte avec `test@example.com` |
| Étapes | 1. POST `/auth/register` avec email/password/firstName/lastName 2. Vérifier réponse |
| Résultat attendu | `201` avec `accessToken`, `refreshToken`, `user.emailVerified = false` |
| Statut | ✅ |

#### REC-AUTH-002 : Email de confirmation envoyé
| Champ | Valeur |
|---|---|
| Préconditions | REC-AUTH-001 réussi |
| Étapes | 1. Consulter MailHog sur `http://localhost:8025` 2. Vérifier email "Verify your email" |
| Résultat attendu | Email reçu avec lien `/verify-email?token=xxx` ou code affiché |
| Statut | ✅ |

#### REC-AUTH-003 : Vérification email
| Champ | Valeur |
|---|---|
| Préconditions | Email de confirmation reçu |
| Étapes | 1. GET `/auth/verify-email?token=<token_du_mail>` |
| Résultat attendu | `200` avec `message: "Email verified successfully"` |
| Statut | ✅ |

#### REC-AUTH-004 : Connexion email/password
| Champ | Valeur |
|---|---|
| Préconditions | Compte créé (REC-AUTH-001) |
| Étapes | 1. POST `/auth/login` avec email/password |
| Résultat attendu | `200` avec `accessToken`, `refreshToken`, `user` |
| Statut | ✅ |

#### REC-AUTH-005 : Mot de passe incorrect
| Champ | Valeur |
|---|---|
| Préconditions | Compte créé |
| Étapes | 1. POST `/auth/login` avec bon email, mauvais password |
| Résultat attendu | `401` avec `error: "Invalid credentials"` |
| Statut | ✅ |

#### REC-AUTH-006 : Mot de passe oublié via SMS
| Champ | Valeur |
|---|---|
| Préconditions | Compte avec `phoneNumber` renseigné |
| Étapes | 1. POST `/auth/forgot-password` avec email 2. Vérifier logs `[SMS MOCK]` |
| Résultat attendu | `200`, `channel: "sms"`, code 6 chiffres dans logs |
| Statut | ✅ |

#### REC-AUTH-007 : Mot de passe oublié sans téléphone (fallback email)
| Champ | Valeur |
|---|---|
| Préconditions | Compte sans `phoneNumber` |
| Étapes | 1. POST `/auth/forgot-password` avec email 2. Vérifier MailHog |
| Résultat attendu | `200`, `channel: "email"`, email avec code 6 chiffres |
| Statut | ✅ |

#### REC-AUTH-008 : Réinitialisation mot de passe avec code
| Champ | Valeur |
|---|---|
| Préconditions | REC-AUTH-006 ou 007 réussi, code récupéré |
| Étapes | 1. POST `/auth/reset-password` avec email, code, password |
| Résultat attendu | `200`, `message: "Password reset successfully"` |
| Statut | ✅ |

#### REC-AUTH-009 : Code reset incorrect
| Champ | Valeur |
|---|---|
| Préconditions | Code reset valide en DB |
| Étapes | 1. POST `/auth/reset-password` avec mauvais code |
| Résultat attendu | `400`, `error: "Invalid reset code"` |
| Statut | ✅ |

#### REC-AUTH-010 : OAuth Google — initiation
| Champ | Valeur |
|---|---|
| Préconditions | `GOOGLE_CLIENT_ID` configuré |
| Étapes | 1. GET `/auth/oauth/google` dans navigateur |
| Résultat attendu | Redirection vers `accounts.google.com/o/oauth2/v2/auth` |
| Statut | ✅ (si creds configurées) |

#### REC-AUTH-011 : OAuth sans credentials configurés
| Champ | Valeur |
|---|---|
| Préconditions | `GOOGLE_CLIENT_ID` vide |
| Étapes | 1. GET `/auth/oauth/google` |
| Résultat attendu | `503`, `error: "google OAuth not configured"` |
| Statut | ✅ |

#### REC-AUTH-012 : Activation 2FA TOTP
| Champ | Valeur |
|---|---|
| Préconditions | Connecté avec JWT valide |
| Étapes | 1. POST `/auth/totp/setup` avec token 2. Scanner QR code avec Google Authenticator 3. POST `/auth/totp/verify` avec code TOTP |
| Résultat attendu | `200`, `message: "TOTP enabled"` |
| Statut | ✅ |

---

### Service IA — Recettes

#### REC-AI-001 : Requête IA en mode mock
| Champ | Valeur |
|---|---|
| Préconditions | `AI_MODE=mock` |
| Étapes | 1. POST `/ai/prompt` avec `userId` valide + `prompt` |
| Résultat attendu | `200`, `response` contient `[MOCK]`, `tokensUsed ≥ 0` |
| Statut | ✅ |

#### REC-AI-002 : Requête IA avec prompt vide
| Champ | Valeur |
|---|---|
| Étapes | 1. POST `/ai/prompt` avec `prompt: ""` |
| Résultat attendu | `400`, `error: "Validation failed"` |
| Statut | ✅ |

#### REC-AI-003 : Liste des modèles disponibles
| Champ | Valeur |
|---|---|
| Étapes | 1. GET `/ai/models` |
| Résultat attendu | `200`, `models` array, `currentMode` présent |
| Statut | ✅ |

---

### Service Paiement — Recettes

#### REC-PAY-001 : Souscription plan Pro mensuel
| Champ | Valeur |
|---|---|
| Préconditions | Utilisateur authentifié, plan Pro existant en DB |
| Étapes | 1. POST `/payments/create-checkout` avec userId, planId, interval: "MONTHLY" |
| Résultat attendu | `200`, `success: true`, `amount: 1499`, `paymentId` défini |
| Statut | ✅ |

#### REC-PAY-002 : Email facture envoyé après paiement
| Champ | Valeur |
|---|---|
| Préconditions | REC-PAY-001 réussi |
| Étapes | 1. Consulter MailHog 2. Vérifier email "Payment Confirmed" |
| Résultat attendu | Email avec montant 14.99€, plan Pro, interval Mensuel |
| Statut | ✅ |

#### REC-PAY-003 : Email début abonnement envoyé
| Champ | Valeur |
|---|---|
| Préconditions | REC-PAY-001 réussi |
| Étapes | 1. Consulter MailHog 2. Vérifier email "Subscription Active" |
| Résultat attendu | Email avec date de renouvellement |
| Statut | ✅ |

#### REC-PAY-004 : Souscription plan annuel
| Champ | Valeur |
|---|---|
| Étapes | 1. POST `/payments/create-checkout` avec interval: "YEARLY" |
| Résultat attendu | `success: true`, `amount: 14999`, période 365 jours |
| Statut | ✅ |

#### REC-PAY-005 : Plan inexistant → erreur
| Champ | Valeur |
|---|---|
| Étapes | 1. POST `/payments/create-checkout` avec planId inexistant |
| Résultat attendu | `404`, `error: "Plan not found"` |
| Statut | ✅ |

#### REC-PAY-006 : Notification fin d'abonnement (J-7)
| Champ | Valeur |
|---|---|
| Préconditions | Abonnement actif avec `currentPeriodEnd` dans 7 jours |
| Étapes | 1. Attendre le cron (ou forcer avec restart payment-service) 2. Consulter MailHog |
| Résultat attendu | Email "Subscription Expiring Soon" reçu |
| Statut | ✅ |

---

### Service Notifications — Recettes

#### REC-NOTIF-001 : Envoi email direct
| Champ | Valeur |
|---|---|
| Étapes | 1. POST `/notifications/send` avec userId, to, subject, body |
| Résultat attendu | `200`, `message: "Email sent"` |
| Statut | ✅ |

#### REC-NOTIF-002 : Envoi SMS mock
| Champ | Valeur |
|---|---|
| Étapes | 1. POST `/notifications/send-sms` avec userId, to, body |
| Résultat attendu | `200`, `mode: "mock"`, log `[SMS MOCK]` dans console |
| Statut | ✅ |

#### REC-NOTIF-003 : Push notification mock
| Champ | Valeur |
|---|---|
| Étapes | 1. POST `/notifications/send-push` avec userId, deviceToken, title, body |
| Résultat attendu | `200`, `mode: "mock"`, log `[PUSH MOCK]` dans console |
| Statut | ✅ |

---

## 4. Plan de correction des anomalies

### Classification des priorités

| Priorité | Description | Délai correction | Exemple |
|---|---|---|---|
| **P1 — Critique** | Perte de données, service totalement down | < 4h | Auth service unreachable, DB crash |
| **P2 — Majeur** | Fonctionnalité importante non fonctionnelle | < 24h | Paiements échouent, OAuth broken |
| **P3 — Mineur** | Défaut non bloquant | < 1 semaine | Email de bienvenue non envoyé |
| **P4 — Évolution** | Amélioration souhaitée | Backlog | Nouvelle feature, amélioration UI |

### Processus de correction

```
Détection anomalie (Prometheus alert / rapport utilisateur)
        ↓
Consignation dans GitHub Issues (template ci-dessous)
        ↓
Classification P1/P2/P3/P4
        ↓
Assignation développeur responsable
        ↓
Analyse root cause (docker compose logs, Grafana)
        ↓
Branche hotfix/INC-XXX
        ↓
Correctif + tests unitaires couvrant le bug
        ↓
Pull Request + revue obligatoire
        ↓
CI/CD : build → tests → quality gate
        ↓
Déploiement staging → smoke tests → production
        ↓
Monitoring 2h post-déploiement
        ↓
Clôture incident + post-mortem (P1/P2)
```

### Template fiche anomalie (GitHub Issue)

```markdown
## [BUG] Titre court et descriptif

**Priorité:** P1 / P2 / P3 / P4
**Service:** auth / db / ai / payment / notification / frontend
**Environnement:** Dev / Staging / Production

### Description
Décrire précisément le comportement observé.

### Étapes de reproduction
1. ...
2. ...
3. ...

### Résultat attendu
...

### Résultat obtenu
...

### Logs
```
docker compose logs [service] --tail 50
```

### Captures d'écran
(si applicable)

### Assigné à
@developer
```

---

## 5. Pipeline CI/CD

### Configuration GitHub Actions (`.github/workflows/ci.yml`)

```
Push / Pull Request sur main
         ↓
┌─────────────────────────────────┐
│  Job: build-and-test             │
│  OS: ubuntu-latest               │
│  Node: 20                        │
├─────────────────────────────────┤
│ 1. Checkout code                 │
│ 2. npm install (workspaces)      │
│ 3. tsc --noEmit (type check)     │
│ 4. npm run test (Vitest)         │
│ 5. npm audit (sécurité)          │
├─────────────────────────────────┤
│  Job: docker-build               │
│  (seulement sur main)            │
├─────────────────────────────────┤
│ 6. docker build auth-service     │
│ 7. docker build db-service       │
│ 8. docker build ai-service       │
│ 9. docker build payment-service  │
│ 10. docker build notif-service   │
│ 11. docker build frontend        │
└─────────────────────────────────┘
```

### Quality Gate (bloque le merge si non respecté)

| Critère | Seuil | Outil |
|---|---|---|
| Couverture de code | > 80% | Vitest --coverage |
| Bugs bloquants | 0 | Tests Vitest |
| Vulnérabilités critiques | 0 | npm audit |
| TypeScript errors | 0 | tsc --noEmit |
| Code duplication | < 3% | (manuelle via review) |

### Commandes locales de vérification

```bash
# Lancer tous les tests
npm run test --workspaces

# Type check tous les services
npm run typecheck --workspaces

# Audit sécurité
npm audit --workspaces

# Build Docker tous les services
docker compose build

# Tests avec couverture
npm run test -- --coverage --workspace=services/auth-service
```

---

## 6. Documentation technique

### Structure du projet

```
saas-ia/
├── .github/workflows/     # CI/CD GitHub Actions
├── docs/                  # Documentation projet (BC01-BC04)
├── frontend/              # Application React/Vite
│   └── src/App.tsx        # Single-file SPA (routing, pages, auth)
├── gateway/               # API Gateway (proxy HTTP)
├── infra/                 # Config Prometheus, Grafana, PostgreSQL
├── services/
│   ├── ai-service/        # Service IA (Gemini + mock)
│   ├── auth-service/      # Auth JWT + OAuth + 2FA
│   ├── db-service/        # Service base de données (Prisma)
│   │   └── prisma/
│   │       └── schema.prisma  # Modèle de données
│   ├── metrics-service/   # Collecte métriques
│   ├── notification-service/ # Email + SMS + Push
│   └── payment-service/   # Paiements + abonnements
└── docker-compose.yml     # Orchestration locale
```

### Variables d'environnement critiques

| Variable | Service | Description |
|---|---|---|
| `INTERNAL_API_KEY` | Tous | Clé d'accès inter-services |
| `JWT_ACCESS_SECRET` | auth | Secret signing JWT access |
| `JWT_REFRESH_SECRET` | auth | Secret signing JWT refresh |
| `DATABASE_URL` | db | URL PostgreSQL |
| `GEMINI_API_KEY` | ai | Clé API Google Gemini |
| `AI_MODE` | ai | `mock` ou `gemini` |
| `GOOGLE_CLIENT_ID/SECRET` | auth | OAuth Google |
| `GITHUB_CLIENT_ID/SECRET` | auth | OAuth GitHub |
| `DISCORD_CLIENT_ID/SECRET` | auth | OAuth Discord |
| `TWILIO_ACCOUNT_SID` | notification | SMS Twilio |
| `SMS_MODE` | notification | `mock` ou `twilio` |
| `FIREBASE_SERVER_KEY` | notification | Push Firebase |
| `STRIPE_SECRET_KEY` | payment | Clé Stripe |
| `FRONTEND_URL` | auth, payment | URL frontend pour redirections |

### Endpoints API par service

#### Auth Service (:4002)
| Méthode | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Inscription + email vérification |
| POST | `/auth/login` | Connexion email/password |
| POST | `/auth/refresh` | Refresh JWT token |
| POST | `/auth/logout` | Déconnexion |
| GET | `/auth/me` | Profil utilisateur authentifié |
| GET | `/auth/verify-email?token=` | Vérification email |
| POST | `/auth/forgot-password` | Envoi code reset (SMS/email) |
| POST | `/auth/reset-password` | Reset avec email+code+password |
| GET | `/auth/oauth/:provider` | Initiation OAuth |
| GET | `/auth/oauth/:provider/callback` | Callback OAuth |
| POST | `/auth/totp/setup` | Activation 2FA |
| POST | `/auth/totp/verify` | Vérification 2FA |
| DELETE | `/auth/totp/disable` | Désactivation 2FA |

#### Notification Service (:4003)
| Méthode | Endpoint | Description |
|---|---|---|
| POST | `/notifications/send` | Email direct |
| POST | `/notifications/send-template` | Email templateé (9 templates) |
| POST | `/notifications/send-sms` | SMS (mock/Twilio) |
| POST | `/notifications/send-push` | Push (mock/Firebase) |
| GET | `/notifications/user/:userId` | Historique notifications |

#### AI Service (:4004)
| Méthode | Endpoint | Description |
|---|---|---|
| POST | `/ai/prompt` | Requête IA |
| GET | `/ai/models` | Liste modèles disponibles |
| GET | `/ai/history/:userId` | Historique requêtes |

#### Payment Service (:4005)
| Méthode | Endpoint | Description |
|---|---|---|
| GET | `/payments/plans` | Liste des plans |
| POST | `/payments/create-checkout` | Créer abonnement (mock/Stripe) |
| POST | `/payments/webhook` | Webhook Stripe |
| GET | `/payments/history/:userId` | Historique paiements |

### Manuel de déploiement rapide

```bash
# 1. Cloner et configurer
git clone https://github.com/sidalimer/saas-ia-platform.git
cd saas-ia-platform
cp .env.example .env
# Éditer .env avec vos clés API

# 2. Démarrer tous les services
docker compose up -d

# 3. Vérifier le démarrage
docker compose ps
curl http://localhost:8081/health

# 4. Accéder aux services
# Frontend : http://localhost:5173
# MailHog  : http://localhost:8025
# Grafana  : http://localhost:3000
# Prometheus: http://localhost:9090

# 5. Rollback si problème
docker compose down
git checkout HEAD~1
docker compose up -d --build
```

---

*Document rédigé dans le cadre du bloc BC02 — Tests et Documentation Technique*
