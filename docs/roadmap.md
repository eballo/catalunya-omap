# Roadmap de catalunya-omap

## 1. Deploy automàtic de la demo a cada release

**Objectiu:** que en fer release es publiqui sola la versió nova a la demo, i que la demo només tingui la darrera. Menys versions velles penjades vol dir menys problemes de versions i de vulnerabilitats.

**Estat actual:** el deploy és manual (`npm run deploy`, SFTP, amb contrasenya interactiva) i cada versió va a un directori propi (`omap2`, `omap21`, `omap211`…). Les antigues s'acumulen a la demo.

### Disseny proposat

1. **Job `deploy-demo` a `.github/workflows/build.yml`**, després de `release` i només si ha fet release. Fa checkout del tag nou (`v<versió>`), `npm ci`, `npm run buildDemo` i la pujada.
2. **Una sola versió a la demo.** Dues maneres, per decidir:
   - **A. Directori estable `omap/` (recomanada).** Cada release sobreescriu el directori i esborra el que ja no existeix al build. La URL no canvia mai i `demo.md` passa a una sola línia.
   - **B. Directori amb versió** (`omap216`). Després de pujar, s'esborren tots els `omap*` menys l'actual.
3. **Neteja inicial, un sol cop i amb confirmació:** llistar i esborrar les carpetes `omapXX` antigues de la demo.
4. **Deploy per rsync en lloc de SFTP** (`rsync --delete`), com `scripts/publish-apk.sh` a `catalunya-medieval-app`. L'esborrat queda dins del mateix directori i no toca res fora.

### Clau SSH

- La clau `CM_SSH_PRIVATE_KEY` que ja existeix és **només al repo `catalunya-medieval-app`**, i està **confinada amb rrsync a `downloads/`**: no arriba a la demo i no serveix per a SFTP.
- Cal una **segona clau ed25519 dedicada a la demo**, confinada amb rrsync al directori de la demo (si una es filtra, no dona accés a l'altra).
- Al repo `catalunya-omap` (ara només té `SONAR_TOKEN`): secret `CM_SSH_PRIVATE_KEY` amb la clau nova i variables `CM_SSH_USER` i `CM_SSH_HOST` (mateixos valors que a l'app), amb el host key de `ssh.cluster110.hosting.ovh.net` fixat al workflow com fa l'app.
- La clau pública l'ha d'afegir l'usuari a l'`authorized_keys` d'OVH (`! ssh-add ~/.ssh/cm_ovh` abans si ho fa Claude).
- Els runners de GitHub **ja poden entrar** a l'SSH d'OVH (el workflow `Publish APK` hi funciona).

### Pendent de decidir

- A o B per a la política de directoris.
- Directori exacte de la demo a OVH (el valor és a `.env.demo`, `SFTP_REMOTE_PATH`).
- Si la captura de `screenshot/` del README també s'ha de generar a CI (ara és manual) o es manté a part.

### Tasques

- [ ] Decidir A o B
- [ ] Generar la clau de la demo i confinar-la amb rrsync a OVH
- [ ] Secrets i variables a GitHub
- [ ] Reescriure `scripts/deploy.js` amb rsync, mode CI i `--delete`
- [ ] Job `deploy-demo` al workflow
- [ ] Prova amb un primer deploy
- [ ] Neteja de les versions velles de la demo
- [ ] Actualitzar `CLAUDE.md` (treure els passos manuals de deploy) i `demo.md`
