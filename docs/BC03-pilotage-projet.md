# BC03 — Pilotage de Projet et Management

## 1. Méthodologie choisie : Scrum

| Critère | Justification |
|---|---|
| Besoin évolutif | Les fonctionnalités IA et paiement peuvent évoluer rapidement |
| Feedback rapide | Chaque sprint livre une version fonctionnelle testable |
| Équipe | 5 personnes, taille idéale pour Scrum |
| Cérémonies | Sprint Planning, Daily, Review, Retrospective |

---

## 2. User Stories (Backlog produit)

| ID | User Story | Priorité | Points |
|---|---|---|---|
| US-001 | En tant qu'utilisateur, je veux m'inscrire avec mon email et recevoir un mail de confirmation | Must | 5 |
| US-002 | En tant qu'utilisateur, je veux me connecter via Google, GitHub ou Discord (OAuth) | Must | 8 |
| US-003 | En tant qu'utilisateur, je veux réinitialiser mon mot de passe par email | Must | 5 |
| US-004 | En tant qu'utilisateur, je veux activer la double authentification (2FA TOTP) | Should | 5 |
| US-005 | En tant qu'utilisateur, je veux envoyer une requête à l'IA et recevoir une réponse | Must | 8 |
| US-006 | En tant qu'utilisateur, je veux consulter l'historique de mes requêtes IA | Should | 3 |
| US-007 | En tant qu'utilisateur, je veux souscrire un abonnement mensuel ou annuel | Must | 13 |
| US-008 | En tant qu'abonné, je veux recevoir une facture par email après paiement | Must | 5 |
| US-009 | En tant qu'abonné, je veux être notifié avant l'expiration de mon abonnement | Should | 3 |
| US-010 | En tant qu'admin, je veux visualiser les métriques de tous les services | Should | 5 |
| US-011 | En tant qu'utilisateur, je veux gérer mon profil et mes paramètres | Could | 3 |
| US-012 | En tant que système, je veux envoyer des SMS de notification (mot de passe oublié) | Could | 5 |

---

## 3. Planning des Sprints

| Sprint | Objectif | User Stories | Points | Durée |
|---|---|---|---|---|
| **Sprint 1** | Infrastructure + Auth de base | US-001, US-002, US-003 | 18 | 2 semaines |
| **Sprint 2** | Service IA + 2FA | US-004, US-005, US-006 | 16 | 2 semaines |
| **Sprint 3** | Paiements + Notifications | US-007, US-008, US-009 | 21 | 2 semaines |
| **Sprint 4** | Monitoring + Finitions | US-010, US-011, US-012 | 13 | 2 semaines |
| **TOTAL** | | | **68 points** | **8 semaines** |

---

## 4. Organisation de l'équipe

| Rôle | Responsabilités | Compétences |
|---|---|---|
| **Tech Lead (vous)** | Architecture, arbitrages techniques, code review | Full-stack, DevOps, IA |
| **Dev Backend 1** | Auth Service + DB Service | Node.js, PostgreSQL, JWT |
| **Dev Backend 2** | AI Service + Payment Service | Node.js, Stripe, API IA |
| **Dev Frontend** | Application React | React, TypeScript, UX |
| **DevOps** | CI/CD, monitoring, infra Docker | Docker, Prometheus, GitHub Actions |

### Plan de montée en compétences

| Membre | Compétence à développer | Action | Sprint |
|---|---|---|---|
| Dev Backend 1 | Tests unitaires Vitest | Pair programming | S2 |
| Dev Frontend | TypeScript avancé | Formation en ligne | S1 |
| Dev Backend 2 | OAuth 2.0 flows | Documentation Google | S1 |

---

## 5. Attribution par sprint

| Sprint | Dev Backend 1 | Dev Backend 2 | Dev Frontend | DevOps |
|---|---|---|---|---|
| S1 | Auth + DB | Infrastructure | Pages Auth + OAuth UI | Docker Compose + CI |
| S2 | Tests Auth | Service IA | Chat IA + Dashboard | Prometheus setup |
| S3 | Tests DB | Service Paiement | Pages Plans + Settings | Grafana dashboards |
| S4 | Revue générale | Tests E2E | Polissage UI | Déploiement staging |

---

## 6. Indicateurs de pilotage (KPIs)

| Indicateur | Description | Fréquence | Seuil d'alerte |
|---|---|---|---|
| **Vélocité** | Points livrés / sprint | Par sprint | < -20% vs prévu |
| **Burndown** | Reste à faire vs temps | Quotidien | Au-dessus tendance |
| **Lead time** | Durée ticket → prod | Hebdo | > 2 semaines |
| **Bugs ouverts** | Anomalies non résolues | Quotidien | > 5 P1/P2 |
| **Couverture tests** | % code testé | Par PR | < 80% |
| **Temps réponse API** | Latence endpoints | Temps réel | > 1000ms |
| **Taux d'erreur** | % requêtes en erreur | Temps réel | > 5% |

---

## 7. Gestion des risques

| Risque | Statut | Probabilité | Impact | Action |
|---|---|---|---|---|
| API Gemini quota | **Matérialisé** | 100% | Moyen | ✅ Fallback mock implémenté |
| Retard service Auth | Actif | 30% | Critique | Priorisation Sprint 1 |
| Dette technique | Potentiel | 40% | Moyen | Code review par PR |
| Non-conformité RGPD | Potentiel | 20% | Critique | Audit S4 |
| Indisponibilité dev | Potentiel | 15% | Élevé | Documentation complète |

---

## 8. Plan de communication

| Type | Fréquence | Participants | Objectif |
|---|---|---|---|
| Daily Standup | Quotidien | Équipe dev | Avancement + blocages |
| Sprint Review | Fin sprint | Client + Équipe | Démo, validation |
| Sprint Retro | Fin sprint | Équipe | Amélioration process |
| Weekly Status | Hebdo | Client + Tech Lead | Alertes, KPIs |
| Comité pilotage | Mensuel | Direction | Décisions stratégiques |

---

## 9. Styles de management selon situation

| Situation | Style | Justification |
|---|---|---|
| Nouveau dev junior | **Directif** | Cadrage fort, instructions précises |
| Dev expérimenté | **Délégatif** | Autonomie sur son périmètre |
| Conflit technique | **Participatif** | Consensus, adhésion de l'équipe |
| Urgence production | **Directif** | Décision rapide, pas de comité |
| Motivation en baisse | **Coaching** | Écoute, remotivation, vision |

---

## 10. Tableau de bord sprint (modèle)

### Sprint N — Semaine X

```
BURNDOWN CHART
Points restants
60 |*
50 |  *
40 |    *
30 |      *  ← idéal
25 |        *
20 |          * ← réel
...
 0 +--+--+--+--+--+--+--+--+--+--> Jours
   1  2  3  4  5  6  7  8  9  10
```

| Métrique | Valeur | Statut |
|---|---|---|
| Points planifiés | 21 | — |
| Points livrés | 18 | ⚠️ -14% |
| Bugs ouverts (P1/P2) | 0 | ✅ |
| Couverture tests | 82% | ✅ |
| Lead time moyen | 3j | ✅ |

---

*Document rédigé dans le cadre du bloc BC03 — Pilotage et Management*
