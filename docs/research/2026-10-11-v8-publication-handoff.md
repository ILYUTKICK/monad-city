# Публикация Monad City v8 — подготовка

## Текущее состояние

Существующий Monad Testnet контракт поддерживает v8 без перевыпуска Solidity или изменения
адреса. Подготовлены локальные файлы и tooling. **Реальная публикация не выполнена.**

- Контракт: `0x8d53153a8a25c81701954eed66154b3ebba8b8c7`, chain ID `10143`.
- Publisher: `0x9A0C8040A8C6aB9F65F544578b891Fba599799F8`.
- Onchain head: v7, `0x749a1fa2b3b731ba051f7d18697b8db563adc0b038cb9b3c864430187b62421c`.
- v8: **217 evidence records / 194 sourced relationships**; добавлено 166 связей membership.
  Все 217 evidence records и прежние 28 relationships сохранены без изменений.
- Все новые связи имеют approved evidence; directory/registry listing не становится
  onchain interaction, attestation или доказательством безопасности.

Проверка официального RPC в блоке `70184981` (`2026-10-11T18:38:49Z`) подтвердила:
код совпадает с pin, v7 active/unrevoked, publisher role присутствует, registry не заморожен,
v8 version lookup пуст. Audit: `data/registry/deployments/monad-testnet-v8-preparation.json`.
Это наблюдение через один RPC, не независимое подтверждение консенсуса.

## Что препятствует публикации

1. У approved v8 `createdAt = reviewedAt = 2026-10-11T22:30:00Z`, а review metadata новых
   связей содержит `22:00:00Z`. Эти часы ещё не наступили на момент подготовки.
   Solidity отклоняет review в будущем. Самый ранний допустимый блок имеет timestamp
   `1791757800`: **12 октября 2026, 01:30 МСК**. Утверждённые bytes/hash не менялись.
   Если потребуется исправить ошибочное время, нужен отдельный versioned review/promotion,
   а не перезапись v8. Старый bundle должен остаться исторической границей.
2. Публичный CID папки v8 и gateway ещё не предоставлены. Без них нельзя получить
   проверенный unsigned request. Тестовые URI существуют исключительно в памяти unit/Anvil
   тестов и не используются как публичные артефакты.
3. Финальную подпись транзакции выполняет владелец в своём кошельке. Ключи не запрашивались.

## Подготовленный пакет

Папка `artifacts/ipfs/phase-3.5-v8/` содержит четыре файла:

- `manifest.json`;
- `evidence-proofs.json`;
- `relationship-proofs.json`;
- `data/evidence-snapshots/phase-3.5-v8.json`.

Для IPFS требуется именно папка с этой структурой, не ZIP. Генерация проверяет точное
совпадение канонических snapshot/proof bytes. Публичный manifest намеренно сохраняет
deployment-unconfigured поля: фактический receipt записывается отдельным audit.

Воспроизведение:

```sh
npm run registry:prepare-upload -- phase-3.5-v8
```

Exact pins:

| Поле | Значение |
|---|---|
| Snapshot SHA-256 | `8ca75224fa4d0c0772387aacb332acbdeb40237d048b7eeacde7b9984b03eb6c` |
| Portable snapshot ID | `0x63a64b3b451e0285a52f10d525d184cb4bc68a785b2de39e1b6460b50539acda` |
| Evidence root / count | `0xad3119b5c6ef57be7ef11908d413d98657b1362105bdffefde1b344520cbac27` / 217 |
| Relationship root / count | `0x2ca70198a6179235577e155c845c526e9e0482f5f20f23a1d8574cce0b299c13` / 194 |
| Expected Testnet publication ID | `0x83e176b46b4f6a2155f76977aa5e895efa0105b88a98ead5658107193b4c9a30` |

## Продолжение после получения CID и наступления времени

Команда ниже содержит placeholders: заменить их фактическими CID и gateway владельца.

```sh
npm --prefix contracts run prepare:publication -- \
  ipfs://REAL_V8_FOLDER_CID/manifest.json \
  https://YOUR-GATEWAY.mypinata.cloud/ipfs/ \
  phase-3.5-v8
```

Генератор проверит время блока, все четыре файла через Pinata и независимый Filebase gateway,
точные bytes, код/identity, текущий head v7, publisher role, gas/balance и simulation.
Он независимо кодирует ABI через Cast и пишет новый файл
`tools/registry-publish/requests/phase-3.5-v8.json` исключительно при успехе.
Если head изменился или v8 уже опубликован, нельзя повторять подпись без проверки receipt.

Локальная страница: `http://localhost:5173/tools/registry-publish/index.html?version=phase-3.5-v8`.
Пока request отсутствует, она проверяет локальный bundle, показывает состав v8 и причину
ожидания, держит wallet/publication действия disabled. После генерации открыть её в Chrome
с кошельком publisher, выполнить Connect / Check publication. Владелец нажимает
Publish snapshot и подтверждает fee в кошельке. Transfer value = 0 MON; оплачивается gas.
Свежая fee сейчас не оценивалась, поскольку simulation ещё недопустима.

После подписи: проверить реальную транзакцию и receipt, сохранить publication audit,
проверить finality и representative evidence/relationship proofs со всеми support records.
Только затем обновлять `src/registry-config.js` на точные v8 pins и проверять Passport/Navigator.
Исторические v6/v7 requests и audits сохраняются.

## Изменённые файлы и проверки

- `tools/registry-publish/core.js`: точный v8 predecessor и early timestamp gate.
- `contracts/script/prepare-publication.mjs`: временная проверка до IPFS retrieval/simulation.
- `tools/registry-publish/app.js`, `index.html`: честная страница reviewed package при отсутствующем
  request; прежние подготовленные публикации продолжают проходить полную validation.
- `scripts/registry/publication.test.js`: v8 roots/counts/proofs/identity, predecessor mutation
  rejection, временная граница и отсутствие simulation до её наступления.
- `contracts/script/publication-e2e.mjs`: реальные reviewed v6→v7→v8 bundles на одноразовом Anvil;
  client и Solidity отклоняют v8 за секунду до review, принимают на границе; v7 superseded;
  повторная публикация блокируется. Clock фиксирован для воспроизводимости после даты review.
- `docs/PROJECT_CONTEXT.md`: исправлен устаревший count proof bundle с 28 на 194.
- Deployment preparation audit, этот handoff, запись в WORKLOG и локальная upload папка.

PASS: build/approved pair/registry verification; publication tests 8/8; read-only client tests
11/11; loopback publication E2E; source syntax и diff whitespace. Trust/Data агент отдельно
сверил 166 additions и reviewed bundle и проверил ABI/guard; ошибок не найдено.

Существующий Solidity bytecode и public runtime config не изменены. Никакой внешней
транзакции, IPFS upload, wallet request или публикации в этом проходе не выполнено.
