# RFC 0001: `npm-sweeper` – Interaktives Tool zum “End-of-Life”-Management eigener npm-Pakete

**Status:** Draft
**Autor:** (Du / Team)
**Zielplattform:** Node.js (CLI/TUI), TypeScript-first
**Problemraum:** Aufräumen, Depricate/Archive/Tombstone/Ownership-Transfer/Unpublish mit klarer UX und Risiko-Transparenz.

---

## 1. Motivation

Maintainer sammeln über Jahre viele Pakete an (Experimente, alte Utilities, überholte Libs). “Einfach löschen” ist zwar emotional befreiend, ist aber im npm-Ökosystem stark reguliert und kann Nebenwirkungen haben.

npm selbst empfiehlt *Deprecation* als “good compromise” und erlaubt *Unpublish* nur unter bestimmten Bedingungen (u.a. 72h-Regel / Kriterien für ältere Pakete). ([docs.npmjs.com][1])
Gleichzeitig ist “Name wieder freigeben” ein legitimes Maintainer-Interesse, wird aber durch diese Regeln begrenzt. ([docs.npmjs.com][1])

**`npm-sweeper`** soll dir als Maintainer ein Tool geben, das:

* deine Pakete findet,
* Auswirkungen & Constraints erklärt,
* dir eine **Auswahl-Liste** wie `npm-check-updates` zeigt,
* und am Ende “abschicken” (= ausführen) kann – mit Dry-Run, Plan-File, und Guardrails.

---

## 2. Ziele

1. **Interaktive TUI** (Terminal UI) mit Liste aller Pakete, Filter/Sortierung, Multi-Select.
2. **Action-Katalog** pro Paket:

   * Deprecate (ganzes Package oder Range)
   * Repo archivieren (z.B. GitHub)
   * Tombstone Release (Major Release, das bewusst “stilllegt”)
   * Ownership Transfer (an User oder an `@npm` als “Abgabe”) ([docs.npmjs.com][2])
   * Unpublish (nur wenn policy-konform; Tool prüft Eligibility) ([docs.npmjs.com][1])
3. **Impact-Erklärung** (“Was passiert dann?”) direkt im UI vor dem Apply.
4. **Plan → Apply Workflow**:

   * `--plan` erzeugt JSON/YAML (reviewbar)
   * `--apply` führt Plan aus (idempotent soweit möglich)
5. **Security & Safety**:

   * kein Persistieren von Tokens,
   * OTP/2FA sauber unterstützen (npm CLI / Header), ([api-docs.npmjs.com][3])
   * Hard-Confirm (z.B. Tippen von `APPLY 12`).

---

## 3. Non-Goals

* Kein “automatisches Löschen” ohne explizite Auswahl.
* Keine “intelligente” Migration von Downstream-Projekten.
* Kein Anspruch, “Dependents” perfekt zu bestimmen (nur best-effort).
* Keine globale “Name-Reclaim”-Policy für npm (Tool kann nur innerhalb npm-Regeln arbeiten).

---

## 4. Terminologie

* **Deprecate:** Markiert Package/Version-Range als deprecated; Installer sehen Warnung. ([docs.npmjs.com][4])
* **Unpublish:** Entfernt Version(en) aus der Registry; nur unter Regeln möglich; nicht rückgängig. ([docs.npmjs.com][1])
* **Tombstone Release:** Neues Major, das beim Import/Run klar fehlschlägt (intentional).
* **Archive Repo:** GitHub/GitLab Repository read-only schalten (Option).
* **Ownership Transfer:** `npm owner add/rm`, ggf. Transfer an `@npm`. ([docs.npmjs.com][5])

---

## 5. User Stories

1. **Als Maintainer** will ich alle meine Pakete sehen, nach “zu alt”/“kaum genutzt” filtern, und mehrere auf einmal “EOL” setzen.
2. Ich will pro Paket verstehen, was “Deprecate”, “Tombstone”, “Unpublish” konkret bedeutet, bevor ich es anwende.
3. Ich will erst einen **Plan** erzeugen (Review), dann später **Apply**.
4. Ich will, dass das Tool *Unpublish* nur anbietet, wenn es überhaupt möglich ist (npm Policy).
5. Ich will einen “Kontaktpfad” hinterlassen (README/Repo/Deprecation Message), statt als “totes Paket ohne Kontakt” zu enden.

---

## 6. High-Level UX

### 6.1 TUI Layout (Skizze)

**Liste (Hauptansicht)**
Spalten (konfigurierbar):

* `pkg`
* `scope`
* `lastPublish`
* `downloads/wk` (optional)
* `owners`
* `suggestedAction`
* `risk`

Interaktion:

* `Space` toggelt Auswahl
* `Enter` Details
* `/` Suche
* `F` Filter (z.B. older-than, downloads, scoped/unscoped)
* `A` Action-set wählen
* `P` Plan exportieren
* `S` “Submit/Apply” (mit Summary + Confirm)

**Details Panel**

* Package-Metadaten
* Current owners/maintainers
* Policy-Checks (Unpublish eligible? warum/warum nicht)
* “Impact cards” je Action

**Finale Summary**

* Liste aller geplanten Changes
* “This is destructive / irreversible” Flags
* Confirm: `type APPLY <N>`.

### 6.2 “npm-check-updates”-Analog

Wie `ncu` Updates vorschlägt, schlägt `npm-sweeper` **EOL-Aktionen** vor (nur Vorschläge). Der User wählt explizit.

---

## 7. Actions & Semantik

### 7.1 Deprecate

**Was tut es:** setzt Deprecation Message auf Package oder Version-Range; Warnung erscheint bei Installversuchen. ([docs.npmjs.com][4])
**UI-Optionen:**

* Message Template (global oder pro Paket)
* Target:

  * `*` (gesamtes Paket)
  * `<=x.y.z` (Range)
  * `1.x` (Major-Line)
* Optional: “Undeprecate” (Message = `""`) ([docs.npmjs.com][2])

**Ausführung (präferiert):**

* via `npm deprecate <pkg>@<range> "<msg>"` (CLI), OTP via `--otp=...` ([docs.npmjs.com][2])

### 7.2 Unpublish

**Was tut es:** entfernt Version(en) dauerhaft; nicht rückgängig; `package@version` bleibt “verbrannt”; kompletter Unpublish blockiert Republish für 24h. ([docs.npmjs.com][1])
**Policy-Constraints:**

* <72h seit Publish: möglich, wenn keine Dependents. ([docs.npmjs.com][1])
* > 72h: nur wenn **keine Dependents**, **<300 Downloads letzte Woche**, **single owner/maintainer**. ([docs.npmjs.com][1])

**UI-Optionen:**

* Unpublish:

  * einzelne Version: `pkg@1.2.3`
  * entire package (force)
* “Name freigeben” wird als Motivation angezeigt, aber mit Risiko-/Policy-Hinweis.

**Ausführung:**

* `npm unpublish <pkg> -f` oder `npm unpublish <pkg>@<ver>` + OTP ([docs.npmjs.com][6])

### 7.3 Tombstone Major Release

**Was tut es:** veröffentlicht ein neues Major, das beim Import/Run klar fehlschlägt (mit Message + Link).
**Ziel:** “faktisch nicht mehr nutzen” ohne Registry-Deletion.

**UI-Optionen:**

* Target Major: `nextMajor` oder `99.0.0`
* Verhalten:

  * throw on import
  * warn + noop
* Readme/Changelog Update (optional)

**Risiko:**

* Bricht Nutzer, die automatisch auf `latest`/`^` updaten.
* Dafür “auditable”: Paket bleibt installierbar.

### 7.4 Ownership Transfer / Abgabe

**Was tut es:** Maintainer wechseln; optional an `@npm` (nach npm Docs). ([docs.npmjs.com][2])
**UI-Optionen:**

* Transfer an Nutzer `foo`
* Transfer an `npm` (Abgabe, du bist raus)

**Ausführung:**

* `npm owner add <user> <pkg>`
* `npm owner rm <you> <pkg>` (+ OTP, wenn nötig) ([docs.npmjs.com][5])

### 7.5 Repo Archivieren + README Banner

**Was tut es:** Repo read-only, README bekommt “Unmaintained since YYYY” + Kontakt/Transfer-Hinweis.
**Implementierung:** Provider-basiert (GitHub/GitLab). (Nicht durch npm-Regeln eingeschränkt.)

---

## 8. Discovery: Pakete finden

### 8.1 Datenquellen

* **Registry Search API** `GET /-/v1/search` (public API) ([blog.npmjs.org][7])
  Query: `text=maintainer:<username>` (best-effort, paginiert)
* Authentifizierter Username via:

  * `npm whoami` (CLI) oder Registry endpoint `/whoami` (optional)

**Hinweis:** Search liefert nicht zwingend “Owner” vs “Maintainer” sauber; Tool muss in Details per `npm owner ls` nachprüfen. ([docs.npmjs.com][5])

### 8.2 Heuristiken (optional, konfigurierbar)

* “unmaintained candidate”, wenn:

  * last publish > X Jahre
  * downloads/week < Y
  * repo archived oder 0 commits seit X
* Tool zeigt **nur Vorschläge**, keine Auto-Actions.

---

## 9. Eligibility Checks

Vor dem Anbieten von “Unpublish” prüft `npm-sweeper`:

* publish age (letztes Publish Datum)
* weekly downloads (wenn verfügbar)
* owner count (`npm owner ls`)
* dependents (best-effort; falls nicht zuverlässig: “unknown → Unpublish disabled by default”)

Policy-Regeln & Irreversibilität werden direkt im UI angezeigt. ([docs.npmjs.com][1])

---

## 10. Security

* Token Handling:

  * liest `NPM_TOKEN` oder nutzt bestehende `npm login` Session
  * **speichert nie** Tokens in Files/Logs
* 2FA/OTP:

  * CLI-Pfade unterstützen `--otp` (Deprecate/Owner/Unpublish) ([docs.npmjs.com][2])
  * optional: WebAuth/OTP Flows via Registry API (out of scope v1; aber Token/OTP Mechanik ist dokumentiert) ([api-docs.npmjs.com][3])
* Logging:

  * Redaction (Tokens, Emails)
  * Audit Log lokal (optional)

---

## 11. CLI Spec (Vorschlag)

```bash
npm-sweeper scan [--user <u>] [--scope @me] [--json]
npm-sweeper tui  [--user <u>] [--scope @me] [--registry <url>]

npm-sweeper plan  --out plan.json [--filters ...]
npm-sweeper apply --in  plan.json [--dry-run] [--yes]
```

Globale Flags:

* `--dry-run` (immer verfügbar)
* `--concurrency <n>`
* `--registry <url>`
* `--otp <code>` (optional; wenn nicht, prompt)
* `--no-git` (nur npm actions)
* `--no-network` (nur Plan anwenden, der keine Calls braucht → mostly irrelevant)

---

## 12. Plan File Format (JSON/YAML)

Beispiel (JSON):

```json
{
  "version": 1,
  "generatedAt": "2026-01-28T10:00:00Z",
  "actor": "sebastian",
  "actions": [
    {
      "package": "old-tool",
      "steps": [
        { "type": "deprecate", "range": "*", "message": "UNMAINTAINED since 2018. No support. Fork if needed." },
        { "type": "archiveRepo", "provider": "github", "repo": "sebastian/old-tool" }
      ]
    },
    {
      "package": "tiny-name",
      "steps": [
        { "type": "unpublish", "target": "package", "force": true }
      ]
    }
  ]
}
```

`apply` validiert vor Ausführung erneut Policy/Ownership (TOCTOU-Schutz).

---

## 13. Execution Engine

* Schritte pro Package sind sequenziell (Dependencies zwischen Steps).
* Packages parallel (concurrency).
* Jede Aktion liefert strukturierte Resultate:

  * `success | skipped | failed`
  * `reason` (z.B. policy not met)
* Rollback:

  * npm: praktisch nicht rollbackbar (Unpublish irreversibel)
  * Git: README/Repo-Changes können via PR statt direct push (optional).

---

## 14. “Impact Cards” (Copy im UI)

Für jede Action zeigt das Tool kurz und klar:

* **Deprecate**

  * “Users will see a deprecation warning on install.” ([docs.npmjs.com][4])
  * “Does not break existing installs by itself.”
* **Unpublish**

  * “Package/version becomes uninstallable.”
  * “Irreversible; republish blocked for 24h after full delete; `pkg@ver` can never be reused.” ([docs.npmjs.com][1])
* **Ownership Transfer**

  * “You lose control after removing yourself.” ([docs.npmjs.com][5])
* **Tombstone**

  * “Latest version will fail intentionally; users updating may break.”

---

## 15. Testing Strategy

* Unit Tests: parsing, plan serialization, diff, policy decision logic.
* Integration (mock registry): nock/msw + fixture packuments.
* “Replay Mode”: recorded HTTP interactions (VCR).
* E2E: optional against a dedicated npm test account (CI secrets).

---

## 16. Milestones

**v0.1**

* scan + tui list + deprecate apply (dry-run + apply)

**v0.2**

* owner transfer + archive repo (GitHub provider)

**v0.3**

* unpublish eligibility checks + guarded unpublish

**v0.4**

* tombstone release generator (template-based)

---

## 17. Offene Fragen

1. Soll “Unpublish” standardmäßig **disabled** sein und nur via `--enable-unpublish` aktivierbar?
2. Tombstone: lieber “throw on import” oder “throw on use” als Default?
3. Repo-Änderungen: direkt pushen oder immer PR?

[1]: https://docs.npmjs.com/policies/unpublish/ "npm Unpublish Policy | npm Docs"
[2]: https://docs.npmjs.com/deprecating-and-undeprecating-packages-or-package-versions/ "Deprecating and undeprecating packages or package versions | npm Docs"
[3]: https://api-docs.npmjs.com/ "npm Registry API"
[4]: https://docs.npmjs.com/cli/v8/commands/npm-deprecate/ "npm-deprecate | npm Docs"
[5]: https://docs.npmjs.com/cli/v8/commands/npm-owner/ "npm-owner | npm Docs"
[6]: https://docs.npmjs.com/unpublishing-packages-from-the-registry/ "Unpublishing packages from the registry | npm Docs"
[7]: https://blog.npmjs.org/post/157615772423/deprecating-the-all-registry-endpoint.html "npm Blog Archive: Deprecating the /-/all registry endpoint"
