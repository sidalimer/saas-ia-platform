# BC01 — Phase de Cadrage Projet

## 1. Cartographie des parties prenantes

### Identification des acteurs

| Acteur | Rôle | Intérêt | Influence |
|---|---|---|---|
| Commanditaire / Product Owner | Finance et valide le projet | Élevé | Élevé |
| Utilisateurs finaux | Consomment le service IA | Élevé | Moyen |
| Équipe de développement | Conçoit et maintient la plateforme | Élevé | Élevé |
| Équipe DevOps | CI/CD, déploiement, monitoring | Moyen | Élevé |
| Support client | Interface avec les utilisateurs | Moyen | Faible |
| Fournisseurs tiers (Google AI, Stripe, Twilio) | APIs critiques | Faible | Élevé |
| Autorités réglementaires (CNIL, RGPD) | Conformité légale | Faible | Élevé |

### Matrice Pouvoir / Intérêt

```
POUVOIR
  ^
H | [Commanditaire]  [Dev Team]
  |                  [DevOps]
  |
M | [Utilisateurs]  [Support]
  | [Fournisseurs tiers]
  |
L | [CNIL]
  +----------------------------> INTÉRÊT
       L       M       H
```

---

## 2. Analyse de la demande et des besoins

### Contexte et enjeux

L'essor de l'IA générative crée une opportunité de marché pour des plateformes SaaS proposant des services d'IA à la demande. L'enjeu est de construire une infrastructure microservices robuste, scalable et sécurisée permettant de monétiser des services IA auprès d'utilisateurs B2C ou B2B.

### Problématique

> Comment proposer un service IA accessible, sécurisé et rentable à travers une architecture microservices moderne, tout en garantissant la conformité RGPD et la qualité de service ?

### Objectifs SMART

| Objectif | Spécifique | Mesurable | Atteignable | Réaliste | Temporel |
|---|---|---|---|---|---|
| Authentification sécurisée | OAuth 3 providers + 2FA | 100% flux implémentés | Oui (JWT + TOTP) | Oui | Sprint 1 |
| Service IA fonctionnel | Intégration Gemini | < 2s temps réponse | Oui | Oui | Sprint 2 |
| Paiements opérationnels | Stripe mock + abonnements | 3 plans disponibles | Oui | Oui | Sprint 3 |
| Monitoring actif | Prometheus + Grafana | 100% services monitorés | Oui | Oui | Sprint 4 |

### Périmètre du projet

**Inclus :**
- 6 microservices (Auth, DB, AI, Payment, Notification, Metrics)
- API Gateway
- Frontend React
- CI/CD GitHub Actions
- Monitoring Prometheus/Grafana

**Exclus :**
- Application mobile native
- Support multi-langues
- Gestion des revendeurs
- Infrastructure cloud (déploiement Kubernetes)

### Contraintes identifiées

- **Technique :** Node.js/TypeScript uniquement, PostgreSQL comme base de données
- **Budgétaire :** APIs gratuites ou freemium (Gemini free tier, Stripe test mode)
- **Temporelle :** Livraison en 4 sprints de 2 semaines
- **Réglementaire :** RGPD — données personnelles stockées en Europe

---

## 3. Étude de faisabilité

### Faisabilité technique

| Composant | Technologie | Maturité | Risque |
|---|---|---|---|
| Backend microservices | Node.js 20 + TypeScript | Très mature | Faible |
| Base de données | PostgreSQL 16 + Prisma ORM | Très mature | Faible |
| API IA | Google Gemini (gratuit) | Mature | Moyen (quota) |
| Paiements | Stripe (mode test) | Très mature | Faible |
| SMS | Twilio (mock en dev) | Mature | Faible |
| Containerisation | Docker + Docker Compose | Très mature | Faible |
| Monitoring | Prometheus + Grafana | Mature | Faible |
| OAuth | Google / GitHub / Discord | Très mature | Faible |

### Faisabilité organisationnelle

- Équipe : 1 Tech Lead + 2 devs backend + 1 dev frontend + 1 DevOps
- Planning : 4 sprints × 2 semaines = 8 semaines
- Dépendances critiques : DB service doit être opérationnel avant tous les autres

### Faisabilité économique

| Poste | Détail | Coût estimé |
|---|---|---|
| Infrastructure dev | Docker local, Git | 0€ |
| API Google Gemini | Free tier 50 req/jour | 0€/mois |
| API Stripe | Mode test | 0€ |
| API Twilio | Trial (crédit offert) | 0€ (dev) |
| Serveur production | VPS 4vCPU/8GB | ~30€/mois |
| **TOTAL développement** | | ~0€ |
| **TOTAL production** | | ~30€/mois |

---

## 4. Cartographie des risques

### Matrice des risques

| # | Risque | Probabilité | Impact | Criticité | Mitigation |
|---|---|---|---|---|---|
| R1 | API Gemini quota dépassé | Haute | Moyen | **Haute** | Fallback mock + cache Redis |
| R2 | Fuite de données utilisateurs | Faible | Critique | **Haute** | Chiffrement bcrypt, JWT secrets, HTTPS |
| R3 | Indisponibilité service tiers (Stripe) | Faible | Élevé | **Moyenne** | Mode mock + retry logic |
| R4 | Mauvaise compréhension du besoin | Moyenne | Élevé | **Haute** | Réunions de validation par sprint |
| R5 | Dette technique accumulée | Moyenne | Moyen | **Moyenne** | Code review, tests > 80% coverage |
| R6 | Retard service Auth | Moyenne | Critique | **Haute** | Priorité max Sprint 1 |
| R7 | Non-conformité RGPD | Faible | Critique | **Haute** | Audit légal, pseudonymisation |
| R8 | Turnover équipe | Faible | Élevé | **Moyenne** | Documentation complète, README |

---

## 5. Veille technologique et réglementaire

### Veille technologique — Service IA

| Critère | Google Gemini | OpenAI GPT-4 | Anthropic Claude |
|---|---|---|---|
| Coût/1M tokens | **Gratuit (limité)** | $30 | $15 |
| Qualité réponses | Très bonne | Excellente | Excellente |
| Latence moyenne | ~1.5s | ~2s | ~2s |
| RGPD compliance | US/EU option | US | US |
| Choix | **✓ Retenu** | Alternative payante | Alternative payante |

**Justification :** Gemini offre un accès gratuit suffisant pour le développement et les démonstrations. La structure du code permet un switch vers OpenAI en modifiant uniquement la variable `AI_MODE`.

### Veille technologique — Authentification

| Solution | Coût | Complexité | OAuth | 2FA | Choix |
|---|---|---|---|---|---|
| **Custom JWT** | 0€ | Moyenne | Manuel | TOTP | **✓ Retenu** |
| Auth0 | 0€ (limite) | Faible | Natif | Natif | Non |
| Firebase Auth | 0€ (limite) | Faible | Natif | Natif | Non |
| Keycloak | 0€ | Haute | Natif | Natif | Non |

**Justification :** Solution custom pour la maîtrise complète du code et la montée en compétences.

### Veille réglementaire

- **RGPD :** Consentement explicite requis, droit à l'effacement implémenté (DELETE /users/:id), données chiffrées (bcrypt, HTTPS)
- **DSP2/PSD2 :** Authentification forte pour les paiements → 2FA TOTP implémenté
- **AI Act européen :** Transparence sur l'utilisation de l'IA → réponses étiquetées [MOCK] ou Gemini

---

## 6. Architecture logicielle

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React/Vite)                 │
│         Login • Dashboard • Chat IA • Plans • Settings   │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP/REST
┌──────────────────────▼──────────────────────────────────┐
│                  API GATEWAY (:8080)                     │
│           Proxy • Rate limiting • CORS                   │
└──┬──────┬──────┬──────┬──────┬────────┬─────────────────┘
   │      │      │      │      │        │
┌──▼──┐ ┌─▼──┐ ┌▼───┐ ┌▼────┐ ┌▼────┐ ┌▼──────┐
│Auth │ │ DB │ │ AI │ │Pay  │ │Notif│ │Metrics│
│:4002│ │:4001│ │:4004│ │:4005│ │:4003│ │:4006  │
└──┬──┘ └─┬──┘ └─┬──┘ └──┬──┘ └──┬──┘ └───┬───┘
   │      │      │       │       │         │
   └──────┴──────┤       │       │         │
              ┌──▼──┐    │    ┌──▼──┐   ┌──▼───┐
              │ PG  │    │    │Mail │   │Prom/ │
              │:5432│    │    │Hog  │   │Grafana│
              └─────┘  ┌─▼──┐└─────┘   └──────┘
                       │Redis│
                       │:6379│
                       └─────┘
```

### Patterns architecturaux

- **Microservices** : Séparation des responsabilités, déploiement indépendant
- **API Gateway** : Point d'entrée unique, proxy transparent
- **Event-driven (partiel)** : Notifications asynchrones après paiement/inscription
- **Repository Pattern** : DB Service abstrait les accès Prisma
- **Fallback Pattern** : AI Service bascule sur mock si Gemini échoue

---

## 7. Estimation des charges

| Service | Développement | Tests | Documentation | Total |
|---|---|---|---|---|
| Infrastructure Docker | 1j | 0.5j | 0.5j | **2j** |
| DB Service | 1j | 1j | 0.5j | **2.5j** |
| Auth Service (+ OAuth) | 3j | 2j | 0.5j | **5.5j** |
| AI Service | 2j | 1j | 0.5j | **3.5j** |
| Payment Service | 2j | 1j | 0.5j | **3.5j** |
| Notification Service | 1.5j | 0.5j | 0.5j | **2.5j** |
| Metrics Service | 1j | 0.5j | 0.5j | **2j** |
| API Gateway | 1j | 0.5j | 0.5j | **2j** |
| Frontend React | 4j | 1j | 0.5j | **5.5j** |
| CI/CD | 1j | 0j | 0.5j | **1.5j** |
| **TOTAL** | **17.5j** | **8j** | **5j** | **30.5j** |

**TJM estimé :** 400€/j × 30.5j = **12 200€**

---

## 8. Dossier de présentation client (synthèse)

### Problématique
> "Comment permettre à des utilisateurs de consommer des services d'IA de manière sécurisée, simple et monétisable ?"

### Solution proposée
Plateforme SaaS multi-tenant basée sur une architecture microservices :
- **Auth** sécurisée : email/password + OAuth (Google, GitHub, Discord) + 2FA
- **Service IA** : Gemini avec fallback mock, historique des requêtes
- **Abonnements** : 3 plans tarifaires, paiement Stripe, emails automatiques
- **Monitoring** : Prometheus + Grafana temps réel

### Points forts
- 100% open-source (Node.js, PostgreSQL, React)
- Coût infra < 30€/mois en production
- Extensible : ajout de nouveaux providers IA en 1 ligne de config

---

*Document rédigé dans le cadre du bloc BC01 — Cadrage et Faisabilité*
