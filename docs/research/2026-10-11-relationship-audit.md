# Аудит графа связей Monad City и готовые рёбра Monad↔проект для snapshot v8

- Дата: 2026-10-11
- Скоуп: read-only аудит активного снапшота `phase-3.5-v7` (`src/evidence-snapshots/phase-3.5-v7.generated.js`, `data/evidence-snapshots/phase-3.5-v7.json`), слоя demo/hybrid в `src/data.js`, списка проектов в `src/main.js` и правил `docs/TRUST_MODEL.md`. Никакие данные и код не менялись; создан только этот отчёт.
- Цель: подготовить внедрение недостающих рёбер `ecosystem_membership` (Monad Foundation App Portal / Monad Infrastructure Directory) в следующий неизменяемый снапшот `phase-3.5-v8`.
- Все числа пересчитаны node-однострочниками по импорту `APPROVED_EVIDENCE_SNAPSHOT`, а не взяты из документации.

## 1. Сводка чисел (пересчитано)

| Показатель | Значение | Как проверено |
| --- | ---: | --- |
| Evidence records в v7 | 217 | `s.records.length`; все `reviewStatus: 'approved'` (Observed 187 / Claimed 30) |
| Sourced relationships в v7 | 28 | `s.relationships.length` |
| Demo relationships (`src/data.js`) | 15 (не 11) | массив `demoRelationships` + runtime-инвариант `demoRelationships.length !== 15` |
| Sourced-замен demo-рёбер | 4 | `monad-apriori`, `monad-magma`, `monad-switchboard` (совпадение id) + `monad-kuru-002` (`revision.supersedesRelationshipId: 'monad-kuru'`) |
| Оставшихся demo-рёбер | 11 | см. секцию 3 |
| Hybrid total (граф приложения) | 39 = 15 − 4 + 28 | логика merge в `src/data.js` |
| Проектов в городе | 176 | `src/main.js` |
| Проектов, затронутых хотя бы одним ребром сегодня | 26 | уникальные `from`/`to` по 28 рёбрам |
| MEM-записей (id содержит `-MEM-`) | 38 | 36 «Monad App Portal» + 2 «Monad Infrastructure Directory» |
| MEM-проектов, у которых уже есть ребро от monad | 3 | `switchboard`, `pyth`, `kuru` |
| MEM-проектов без ребра | 35 | 38 − 3 |
| Существующих рёбер `monad → X` | 5 | `monad-apriori`, `monad-magma`, `monad-switchboard`, `monad-kuru-002`, `monad-pyth-002` |
| **Предлагается новых рёбер в v8** | **35** | по одной MEM-записи на ребро, секция 4 |
| Ожидаемый размер v8 | 217 records / 63 relationships (28 + 35); hybrid = 74 рёбер | 15 − 4 + 63 |

Примечание к ожиданию «~33»: оценка в 33 получается как 38 MEM − 5 существующих рёбер, но это неверно: у `aPriori` и `magma` MEM-записей нет вообще — их рёбра опираются на protocol-registry записи (`E-APRIORI-REGISTRY-001`, `E-MAGMA-REGISTRY-001`). MEM-рёбрами обеспечены только 3 из 5 существующих целей, поэтому корректное число новых рёбер — **35**.

> Расширение аудита (2026-10-11, по запросу владельца): полное покрытие `monad→X` для всех 176 проектов и агрегаты по дистриктам вынесены в секции 8–11 в конце файла. Секция 4 остаётся готовым подмножеством (только класс A).

## 2. Проверка целостности 28 sourced relationships — проблем нет

Проверено программно для каждого из 28 рёбер:

| Проверка | Результат |
| --- | --- |
| Каждый `evidenceIds` резолвится в запись снапшота | OK (0 «not found») |
| Все связанные записи `reviewStatus: 'approved'` | OK (217/217 approved; 0 rejected/stale/proposed) |
| `from`/`to` — реальные id проектов из 176 в `src/main.js` | OK (26 уникальных endpoint'ов, все резолвятся) |
| Наличие `scope` и непустого `limitations` | OK (28/28) |
| `type` ∈ `RELATIONSHIP_TYPES` (`src/data.js`) | OK; используется `ecosystem_membership` (6) и `declared_integration` (22) |
| Claim status Observed/Claimed | OK: 6 Observed + 22 Claimed. Нюанс: в снапшоте поле называется `status`; `claimStatus` появляется только на runtime-слое (`sourcedRelationship()` в `src/data.js`). Это не дефект, но важно для генератора v8 |
| Конвенция projectId: для ребра `monad → X` запись имеет `projectId: X` | OK (6/6 membership-рёбер) |
| Дубликаты id и троек `from|to|type` | OK (нет) |
| `reviewStatus: 'approved'` + `reviewedAt` + inline `reviewMetadata` (`phase-3.7-review-policy-v1`) | OK; 6 рёбер reviewed 2026-09-22T22:02:32Z, 22 — 2026-10-10T15:56:53Z |
| `ecosystem_membership` отображается только как `source-observed` (`sourcedEvidenceState('Observed')`) | OK |

### Слой demo/hybrid (проверка B)

- Demo-рёбер ровно **15**, все с `dataMode: 'demo'`, недоступным placeholder-источником и ссылкой `demo:relationship:<id>:unavailable` (инвариант `validateDataContract` выполняется).
- Заменены sourced-версиями 4 demo-рёбра: `monad-apriori`, `monad-magma`, `monad-switchboard` (по совпадению id) и `monad-kuru` (через `supersedesRelationshipId` у `monad-kuru-002`).
- Оставшиеся 11 demo-рёбер: `monad-nadfun`, `kuru-apriori`, `kuru-pyth`, `apriori-magma`, `switchboard-pyth`, `switchboard-pixel-forge`, `talus-monad`, `talus-switchboard`, `nadfun-pixel-forge`, `moca-monad`, `moca-talus`.
- Уточнение формулировки `docs/PROJECT_CONTEXT.md` («39 edges, including 11 illustrative or AI-inferred patterns»): число 39 и «11 оставшихся demo» верны, но строго лейблы `illustrative` (3: `monad-nadfun`, `kuru-apriori`, `moca-monad`) и `AI-inferred` (3: `talus-monad`, `talus-switchboard`, `moca-talus`) несут только 6 из 11; остальные 5 — demo-паттерны состояний (`onchain-observed` ×2, `owner-claimed` ×2, `third-party-attested` ×1). Все 11 в любом случае нефактические demo-заглушки.
- Замечание об опасности путаницы сущностей: demo-ребро `monad-nadfun` ведёт в `nadfun` (Nad Arcade), а MEM-запись `E-NAD-FUN-MEM-001` относится к **другому** проекту `nad-fun` (Nad.fun). Оба id существуют в списке 176 проектов. При внедрении v8 их нельзя перепутать; demo-ребро `monad-nadfun` остаётся demo — MEM-записи для `nadfun` нет.

## 3. Проверка review-гейтов (блокеров продвижения нет)

- `reviewDue` на 2026-10-11T00:00:00Z: **0 из 245** субъектов (217 записей + 28 рёбер), посчитано функциями `calculateEvidenceReviewCadence` / `calculateRelationshipReviewCadence` из `src/evidence-contract.js`.
- Ближайший срок: `2026-10-22T22:02:32Z` — рёбра `monad-apriori` и записи kuru/aPriori (30-дневный cadence `ecosystem_membership` / mutable directory URL от review-инстанта 2026-09-22). MEM-записи batch-1 (30 шт., reviewed 2026-09-27T11:34:28Z) и batch-2-добавка (5 шт., 2026-09-27T13:06:37Z) становятся due **2026-10-27**.
- Quality-флаги по 217 записям: `conflict` 4, `incomplete` 7, `stale` 2, `timeBoundEligible` 65 — ни один не блокирует: все записи approved, флаги лишь ограничивают скоуп (затронуты в основном kuru/aPriori/magma/pyth-исторические записи и `E-LEVERUP-PYTH-ORACLE-001`). Отдельных «withheld»-записей в снапшоте нет (withheld-история существует только в workspace-слоях вне v7).
- Следствие для v8: новые рёбра унаследуют `dueBasis: supporting-evidence:<MEM-id>` с `nextReviewAt = 2026-10-27`. Продвижение v8 нужно успеть до `2026-10-22T22:02:32Z`, либо сначала явно пере-review'ить все due-субъекты (политика: promotion останавливается, если хоть один проектируемый субъект due).

## 4. Готовые к внедрению рёбра Monad↔проект для v8 (35)

Каждое ребро опирается ровно на одну approved MEM-запись по образцу уже принятого `monad-kuru-002` (единственная MEM-запись, тип `ecosystem_membership`, `status: Observed`, source `Monad App Portal`, URL `https://app.monad.xyz/`, retrieved 2026-09-26). Шаблон limitations — как у `monad-kuru-002`: «Directory membership is not endorsement, safety review, or an onchain interaction.» Все 35 endpoint'ов проверены по списку проектов в `src/main.js`; коллизий с существующими sourced/demo id нет.

**Уже существуют (не дублировать):** `monad-apriori` (registry-backed), `monad-magma` (registry-backed), `monad-switchboard` (`E-SWITCHBOARD-MEM-001`, Infrastructure Directory), `monad-kuru-002` (`E-KURU-MEM-002`, App Portal), `monad-pyth-002` (`E-PYTH-MEM-001`, Infrastructure Directory).

| Proposed id | from | to | type | claimStatus | evidenceIds | Source | Scope (кратко) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `monad-aave-v3` | monad | `aave-v3` | ecosystem_membership | Observed | `E-AAVE-V3-MEM-001` | Monad App Portal | Lend & Borrow, Leverage Trading; capture 2026-09-26 |
| `monad-pancakeswap` | monad | `pancakeswap` | ecosystem_membership | Observed | `E-PANCAKESWAP-MEM-001` | Monad App Portal | Trading; capture 2026-09-26 |
| `monad-uniswap` | monad | `uniswap` | ecosystem_membership | Observed | `E-UNISWAP-MEM-001` | Monad App Portal | Trading; capture 2026-09-26 |
| `monad-curve` | monad | `curve` | ecosystem_membership | Observed | `E-CURVE-MEM-001` | Monad App Portal | Trading, Yield; capture 2026-09-26 |
| `monad-pendle` | monad | `pendle` | ecosystem_membership | Observed | `E-PENDLE-MEM-001` | Monad App Portal | Yield; capture 2026-09-26 |
| `monad-upshift` | monad | `upshift` | ecosystem_membership | Observed | `E-UPSHIFT-MEM-001` | Monad App Portal | Yield; capture 2026-09-26 |
| `monad-euler` | monad | `euler` | ecosystem_membership | Observed | `E-EULER-MEM-001` | Monad App Portal | Lend & Borrow; capture 2026-09-26 |
| `monad-lagoon` | monad | `lagoon` | ecosystem_membership | Observed | `E-LAGOON-MEM-001` | Monad App Portal | Yield; capture 2026-09-26 |
| `monad-curvance` | monad | `curvance` | ecosystem_membership | Observed | `E-CURVANCE-MEM-001` | Monad App Portal | Lend & Borrow; capture 2026-09-26 |
| `monad-renzo` | monad | `renzo` | ecosystem_membership | Observed | `E-RENZO-MEM-001` | Monad App Portal | Asset Issuer, Yield; capture 2026-09-26 |
| `monad-beefy` | monad | `beefy` | ecosystem_membership | Observed | `E-BEEFY-MEM-001` | Monad App Portal | Yield; capture 2026-09-26 |
| `monad-yuzu-money` | monad | `yuzu-money` | ecosystem_membership | Observed | `E-YUZU-MONEY-MEM-001` | Monad App Portal | Asset Issuer, Yield; capture 2026-09-26 |
| `monad-balancer` | monad | `balancer` | ecosystem_membership | Observed | `E-BALANCER-MEM-001` | Monad App Portal | Trading, Launchpad; capture 2026-09-26 |
| `monad-spectra` | monad | `spectra` | ecosystem_membership | Observed | `E-SPECTRA-MEM-001` | Monad App Portal | Yield; capture 2026-09-26 |
| `monad-mento` | monad | `mento` | ecosystem_membership | Observed | `E-MENTO-MEM-001` | Monad App Portal | Trading, Asset Issuer; capture 2026-09-26 |
| `monad-symbiosis` | monad | `symbiosis` | ecosystem_membership | Observed | `E-SYMBIOSIS-MEM-001` | Monad App Portal | Bridge; capture 2026-09-26 |
| `monad-neverland` | monad | `neverland` | ecosystem_membership | Observed | `E-NEVERLAND-MEM-001` | Monad App Portal | Lend & Borrow; capture 2026-09-26 |
| `monad-ample` | monad | `ample` | ecosystem_membership | Observed | `E-AMPLE-MEM-001` | Monad App Portal | Yield, Asset Issuer; capture 2026-09-26 |
| `monad-perpl` | monad | `perpl` | ecosystem_membership | Observed | `E-PERPL-MEM-001` | Monad App Portal | Trading, Leverage Trading; capture 2026-09-26 |
| `monad-woofi` | monad | `woofi` | ecosystem_membership | Observed | `E-WOOFI-MEM-001` | Monad App Portal | Trading; capture 2026-09-26 |
| `monad-leverup` | monad | `leverup` | ecosystem_membership | Observed | `E-LEVERUP-MEM-001` | Monad App Portal | Leverage Trading; capture 2026-09-26 |
| `monad-kintsu` | monad | `kintsu` | ecosystem_membership | Observed | `E-KINTSU-MEM-001` | Monad App Portal | Liquid Staking; capture 2026-09-26 |
| `monad-levr-bet` | monad | `levr-bet` | ecosystem_membership | Observed | `E-LEVR-BET-MEM-001` | Monad App Portal | Prediction Market, Sports; capture 2026-09-26 |
| `monad-sumer-money` | monad | `sumer-money` | ecosystem_membership | Observed | `E-SUMER-MONEY-MEM-001` | Monad App Portal | Lend & Borrow; capture 2026-09-26 |
| `monad-monday-trade` | monad | `monday-trade` | ecosystem_membership | Observed | `E-MONDAY-TRADE-MEM-001` | Monad App Portal | Leverage Trading; capture 2026-09-26 |
| `monad-capricorn` | monad | `capricorn` | ecosystem_membership | Observed | `E-CAPRICORN-MEM-001` | Monad App Portal | Trading, Yield; capture 2026-09-26 |
| `monad-nad-fun` | monad | `nad-fun` | ecosystem_membership | Observed | `E-NAD-FUN-MEM-001` | Monad App Portal | Launchpad, Trading; capture 2026-09-26 (проект `nad-fun`, НЕ `nadfun`) |
| `monad-drake` | monad | `drake` | ecosystem_membership | Observed | `E-DRAKE-MEM-001` | Monad App Portal | Leverage Trading, Yield; capture 2026-09-26 |
| `monad-kizzy` | monad | `kizzy` | ecosystem_membership | Observed | `E-KIZZY-MEM-001` | Monad App Portal | Entertainment, Prediction Market; capture 2026-09-26 |
| `monad-nabla-finance` | monad | `nabla-finance` | ecosystem_membership | Observed | `E-NABLA-FINANCE-MEM-001` | Monad App Portal | Trading, Yield; capture 2026-09-26 |
| `monad-bean-exchange` | monad | `bean-exchange` | ecosystem_membership | Observed | `E-BEAN-EXCHANGE-MEM-001` | Monad App Portal | Leverage Trading; capture 2026-09-26 |
| `monad-clober` | monad | `clober` | ecosystem_membership | Observed | `E-CLOBER-MEM-001` | Monad App Portal | Trading, Yield; capture 2026-09-26 |
| `monad-covenant` | monad | `covenant` | ecosystem_membership | Observed | `E-COVENANT-MEM-001` | Monad App Portal | Lend & Borrow; capture 2026-09-26 |
| `monad-narbet` | monad | `narbet` | ecosystem_membership | Observed | `E-NARBET-MEM-001` | Monad App Portal | Entertainment; capture 2026-09-26 |
| `monad-narwhal-finance` | monad | `narwhal-finance` | ecosystem_membership | Observed | `E-NARWHAL-FINANCE-MEM-001` | Monad App Portal | Leverage Trading; capture 2026-09-26 |

Точная формулировка scope каждой записи — из её поля `scope` (шаблон: «<Name> App Portal listing membership, displayed categories, and displayed tagline at the capture instant»); claim каждой записи цитирует категорию и tagline. Подразумеваемое limitation для каждого ребра: membership в директории — это не endorsement, не safety review и не onchain-взаимодействие.

## 5. Прочие возможные связи (не-Monad кандидаты)

Просканированы все 217 записей (поля `claim`, `scope`, `supportedProposition`, `provenanceNotes`, `limitations`) по 176 именам/ids проектов. Перекрёстные упоминания нашлись в 28 записях; 22 из них уже материализованы рёбрами v7 (Beefy ×16, Morpho-vault ×3, `magma-switchboard`, `agora-layerzero-oft`, `perpl-agora-collateral`); 23-я материализованная запись, `E-LEVERUP-PYTH-ORACLE-001` (ребро `leverup-pyth-oracle`), в скан не попала только из-за варианта имени «Pyth» vs «Pyth Network». Не материализованы:

| Кандидат | Записи | Вердикт |
| --- | --- | --- |
| `fastlane → shmonad` (asset dependency) | `E-FASTLANE-REGISTRY-001` + `E-SHMONAD-TOKEN-MAPPING-001` | Единственный содержательный кандидат: pinned-запись `fastlane` в реестре Monad явно маппит адрес стейкинг-токена ShMonad `0x1B68…E19c`, и есть парная запись с точки зрения shmonad. Аналог принятых asset-рёбер `beefy-kintsu-asset` / `beefy-shmonad-asset`. Предлагаемая форма: id `fastlane-shmonad-asset`, from `fastlane`, to `shmonad`, `declared_integration`, но `status: Observed` (публикатор — запись реестра, поданная представителями протокола, а не документация Beefy-типа). **Требует решения владельца** по типу/claimStatus перед внедрением; в готовую таблицу не включено |
| `aPriori ↔ capricorn` | `E-APRIORI-CAP-001`, `E-APRIORI-REGISTRY-001` | НЕ ребро. Это identity transition (apr.io → capricorn.tech, одна сущность), явно ограниченный в `docs/TRUST_MODEL.md`. Ребро между двумя манифестами утверждало бы два отдельных проекта. Оставить как есть |
| `euler-dao ↔ euler` | `E-EULER-DAO-REG-001` | DefiLlama-листинг Euler DAO в категории 'Risk Curators' намекает на ту же организацию, но текст не заявляет интеграцию. Не ребро; возможная тема identity-merge, отдельное решение |
| `stakestone ↔ stoneusd` | `E-STAKESTONE-REGISTRY-001` | STONEUSD — адрес внутри собственной записи `stakestone` (продукт той же организации). Не парнёрство; identity-нюанс, ребро не предлагается |
| `beefy ↔ alphagrowth` | `E-BEEFY-EULER-001` | Имя продукта `euler-monad-alphagrowth-ausd` упоминает AUSD (AlphaGrowth), но в отличие от sMON/gMON/shMON нет записи с точным опубликованным адресом токена → по стандарту asset-рёбер недостаточно. Не предлагается без новой записи |

Пулы, которые могут дать дополнительные membership-рёбра в будущих версиях (сейчас сознательно не предлагаются — вне MEM-скоупа, требуют решения владельца):

- Monad protocol registry (pinned commit 36fddcc): 62 записи `protocol-registry-snapshot`, покрывают 62 проекта; 57 из них не имеют ребра от `monad`. Прецедент есть: `monad-apriori` и `monad-magma` опираются именно на такие записи. Это могло бы добавить до ~57 рёбер (вероятно, в v9+).
- DefiLlama: 81 запись, 0 рёбер от `monad`. Сторонний кураторский реестр; формально подходит под определение `ecosystem_membership` («curated or official directory»), но собственные limitations записей подчёркивают, что это не официальный источник Monad. Решение о материализации — за владельцем.

## 6. Риски и замечания

1. **Визуальный шум на карте.** После v8 башня `monad` получит 40 sourced membership-рёбер (5 + 35) плюс 3 demo-ребра, касающиеся `monad` (`monad-nadfun`, `talus-monad`, `moca-monad`) — итого до 43 лучей в Graph View и вокруг центральной башни в City View. По `docs/VISUAL_DIRECTION.md` нельзя добавлять декор без пользы для discovery; нужно заранее решить, как рендерить 35 новых лучей (например, агрегация/притушение membership-лучей, приоритетная подсветка только для активного фильтра или поиска). Ребро `monad-nad-fun` и demo-ребро `monad-nadfun` будут соседствовать — подписи должны различать Nad.fun и Nad Arcade.
2. **Review-дедлайн.** Ближайший due — 2026-10-22T22:02:32Z; MEM-записи due 2026-10-27. Продвижение v8 после этих инстант потребует явных re-review решений по всем due-субъектам (политика `phase-3.7-review-policy-v1`).
3. **Каждое ребро — отдельное review-решение.** Approval MEM-записей не наследуется рёбрами: 35 relationship-кандидатов нужно явно approve (роль `relationship-reviewer`, метод `manual-relationship-evidence-inspection`).
4. **Смена активного SHA-256.** Пара v7 имеет канонический SHA-256 `6a6c7cf9830460fca3ce75bdbfd8510b72b6fba70ada136eb145e45a95155d28`; после v8 активной станет новая пара, и hash в `docs/PROJECT_CONTEXT.md`, константы `EVIDENCE_SNAPSHOT_*` в `src/evidence.js` и пути в `evidence:verify-promotion` (package.json) нужно обновить в одном review-диффе. Также нужен новый ключ `EXPECTED_SNAPSHOT_COUNTS['phase-3.5-v8'] = { records: 217, relationships: 63 }`, иначе runtime-assert упадёт.
5. **Onchain-реестр.** v7 опубликован в Testnet-реестре (`0x3e0f…9d14`). Если владелец хочет синхронность onchain-публикации, v8 потребует нового цикла `registry:export` → `registry:prepare-upload` → подпись → verify; runtime-активацию делать только после receipt/finality.
6. **Поле `status` vs `claimStatus`.** В снапшоте у relationship-объектов поле `status`; runtime переименовывает в `claimStatus`. Генератор v8 должен писать `status` (иначе merge в `src/data.js` выдаст `undefined`).
7. Иммутабельность: менять существующие 217 записей и 28 рёбер нельзя — только добавить новые id (records не добавляются вовсе; 35 новых relationship-id с `revision.sequence: 1`).

## 7. Как внедрять (v8)

```sh
# 1. Экспорт рабочей области из активного снапшота
npm run evidence:export -- --out /tmp/evidence-candidates-v8.json

# 2. Подготовить 35 relationship-кандидатов (по одному на ребро из секции 4)
#    template-id — только форма; все факты заменить на данные MEM-записи
npm run evidence:prepare -- \
  --workspace /tmp/evidence-candidates-v8.json \
  --kind relationship \
  --template-id monad-kuru-002 \
  --id monad-aave-v3 \
  --mode new \
  --out /tmp/evidence-candidates-v8-r1.json
#   ... повторить для остальных 34 id (можно скриптом), затем:
npm run evidence:validate -- \
  --workspace /tmp/evidence-candidates-v8-final.json \
  --previous /tmp/evidence-candidates-v8.json

# 3. Явное review-решение по каждому ребру (35 отдельных команд)
npm run evidence:review -- \
  --workspace /tmp/evidence-candidates-v8-final.json \
  --kind relationship \
  --id monad-aave-v3 \
  --status approved \
  --reviewed-at 2026-10-11T12:00:00Z \
  --out /tmp/evidence-candidates-v8-approved.json

# 4. Снапшот, проверка, дифф
npm run evidence:snapshot -- \
  --workspace /tmp/evidence-candidates-v8-approved.json \
  --previous /tmp/evidence-candidates-v8.json \
  --version phase-3.5-v8 \
  --created-at <UTC> \
  --reviewed-at <UTC> \
  --out /tmp/evidence-snapshot-v8.json
npm run evidence:load -- --snapshot /tmp/evidence-snapshot-v8.json
npm run evidence:diff -- --previous data/evidence-snapshots/phase-3.5-v7.json --current /tmp/evidence-snapshot-v8.json

# 5. Промоушен в checked-in runtime (hash — из вывода evidence:load)
npm run evidence:promote -- \
  --snapshot /tmp/evidence-snapshot-v8.json \
  --previous data/evidence-snapshots/phase-3.5-v7.json \
  --expect-version phase-3.5-v8 \
  --expect-reviewed-at <UTC> \
  --expect-sha256 <64 HEX> \
  --out src/evidence-snapshots/phase-3.5-v8.generated.js

# 6. Обычный review-дифф: добавить data/evidence-snapshots/phase-3.5-v8.json,
#    переключить import и константы в src/evidence.js, добавить
#    EXPECTED_SNAPSHOT_COUNTS['phase-3.5-v8'] = { records: 217, relationships: 63 },
#    обновить пути в evidence:verify-promotion (package.json) и SHA в docs/PROJECT_CONTEXT.md

# 7. Верификация и сборка
npm run evidence:verify-promotion
npm run build
```

После сборки прогнать baseline-проверку UI (load city, выбор здания, Passport, Navigator, City/Graph, фильтр района, поиск, узкий layout) и отдельной задачей решить вопрос отображения 40+ лучей у башни `monad`.

---

## 8. Полное покрытие: monad→X для всех 176 проектов

Метод: каждый из 176 проектов (`src/main.js`) отнесён к сильнейшему классу approved-записей, устанавливающих присутствие на Monad. Приоритет A > B > C > D; у проекта остаётся один класс. Все 217 записей имеют `network.chainId: 143`. Классификация пересчитана скриптом по импорту снапшота; ни один evidenceId не придуман.

| Класс | Определение | Проектов | Из них новых рёбер (без 5 существующих) |
| --- | --- | ---: | ---: |
| A | MEM-запись (Monad App Portal / Monad Infrastructure Directory) | 38 | 35 |
| B | `protocol-registry-snapshot` из Monad protocol registry (pinned commit 36fddcc) | 58 | 56 |
| C | DefiLlama-запись с явным «Monad chain entry» (проверено: 81/81 записей содержат эту фразу в claim) | 75 | 75 |
| D | Иные approved-записи с chainId 143 (publisher statement / explorer / addresses) | 1 (только `monad` сам) | 0 |
| E | Нет Monad-presence evidence (только demo/illustrative слой) | 4 | 0 |
| Итого | | 176 | **166** |

**Класс D — вердикт: пуст как сильнейший класс, в список рёбер не входит.** Единственный проект, чей сильнейший класс — D, это сам `monad` (`E-MONAD-CAP-001`, `E-MONAD-MAINNET-001`, `E-MONAD-NET-001`) — он и есть цель рёбер, ребро самому себе не нужно. Прочие D-записи (`E-KURU-CAP/CONTRACTS/CHAIN-001`, `E-APRIORI-CAP/CHAIN-001`, `E-MAGMA-CAP/CHAIN-001`, `E-SWITCHBOARD-CAP-001`, `E-PYTH-PUSH/CHAIN-001`) принадлежат проектам, уже покрытым классами A/B; `project-declared-relationship`-записи Beefy и др. — это рёбра интеграций, а не independent membership-доказательства (и эти проекты уже в A/C). Отдельного решения «считать ли D» не требуется — кроме явного решения НЕ создавать self-edge.

### 8.1. Класс A — 35 новых рёбер

Полная таблица — в секции 4 (не дублируется). Существующие рёбра класса A: `monad-switchboard`, `monad-kuru-002`, `monad-pyth-002`. Все `claimStatus: Observed`, source `Monad App Portal`.

### 8.2. Класс B — 56 новых рёбер

Формат для всех: proposed id `monad-<projectid>`, from `monad`, type `ecosystem_membership`, `claimStatus: Observed`, одна evidence-запись. Source: «Monad mainnet protocol registry at 36fddcc0021fffe81c7b73a8672347538ec2c9eb» (кроме `monad-shmonad` — «Pinned Monad mainnet protocol registry»). Scope-шаблон: «<Name> appeared in the pinned Monad protocol registry (entry `<entry>`) as live in <категории>, <N> mapped addresses; snapshot 36fddcc». Существующие рёбра класса B: `monad-apriori`, `monad-magma`.

⚠ `monad-shmonad` — единственный **parent-entry** случай: запись маппит токен shMON через чужую запись `fastlane` (limitation записи: «Registry uses the Fastlane parent entry; this record maps only the named shMON token»). Слабее прямой записи; владельцу решить, включать ли его в v8 или дождаться прямой записи `shmonad`.

| Proposed id | evidenceIds | Категории; addr |
| --- | --- | --- |
| `monad-shmonad` | `E-SHMONAD-TOKEN-MAPPING-001` | registry entry `fastlane` maps shMON address 0x1B68…E19c; listing/address identity only |
| `monad-lumiterra` | `E-LUMITERRA-REGISTRY-001` | Games; 5 addr |
| `monad-bro-fun` | `E-BRO-FUN-REGISTRY-001` | Games, Mobile-First; 1 addr |
| `monad-matcha` | `E-MATCHA-REGISTRY-001` | Cross Chain, DEX Aggregator; 6 addr |
| `monad-opensea` | `E-OPENSEA-REGISTRY-001` | Marketplace; 2 addr |
| `monad-fastlane` | `E-FASTLANE-REGISTRY-001` | Liquid Staking, Staking, MEV; 3 addr |
| `monad-agora` | `E-AGORA-REGISTRY-001` | Stablecoin, Asset Issuers; 2 addr |
| `monad-bonad` | `E-BONAD-REGISTRY-001` | Launchpads, Memecoin; 7 addr |
| `monad-kyberswap` | `E-KYBERSWAP-REGISTRY-001` | Cross Chain, DEX Aggregator; 4 addr |
| `monad-pingme` | `E-PINGME-REGISTRY-001` | Neobanks; 3 addr |
| `monad-lootgo` | `E-LOOTGO-REGISTRY-001` | Mobile-First, Games, Other; 6 addr |
| `monad-monorail` | `E-MONORAIL-REGISTRY-001` | DEX Aggregator, Trading Interfaces; 1 addr |
| `monad-aarna` | `E-AARNA-REGISTRY-001` | Yield Aggregator; 2 addr |
| `monad-across` | `E-ACROSS-REGISTRY-001` | Interoperability; 3 addr |
| `monad-apebond` | `E-APEBOND-REGISTRY-001` | Other; 4 addr |
| `monad-blinq` | `E-BLINQ-REGISTRY-001` | Prediction Market, Perpetuals / Derivatives; 1 addr |
| `monad-bungee` | `E-BUNGEE-REGISTRY-001` | Cross Chain, Interoperability; 17 addr |
| `monad-cashmere` | `E-CASHMERE-REGISTRY-001` | Cross Chain; 1 addr |
| `monad-cctp-exchange` | `E-CCTP-EXCHANGE-REGISTRY-001` | Cross Chain, Interoperability; 1 addr |
| `monad-clanker-world` | `E-CLANKER-WORLD-REGISTRY-001` | Launchpads, Other; 8 addr |
| `monad-debridge` | `E-DEBRIDGE-REGISTRY-001` | Interoperability; 4 addr |
| `monad-definitive` | `E-DEFINITIVE-REGISTRY-001` | Trading Interfaces; 3 addr |
| `monad-dfusion-ai` | `E-DFUSION-AI-REGISTRY-001` | Data; 1 addr |
| `monad-dirol` | `E-DIROL-REGISTRY-001` | DEX, DEX Aggregator, Launchpads, Memecoin, Stableswap, Trading Interfaces; 2 addr |
| `monad-flap` | `E-FLAP-REGISTRY-001` | Launchpads; 4 addr |
| `monad-gmgn` | `E-GMGN-REGISTRY-001` | DEX Aggregator; 1 addr |
| `monad-grimmys` | `E-GRIMMYS-REGISTRY-001` | Games, Mobile-First; 3 addr |
| `monad-kinetk` | `E-KINETK-REGISTRY-001` | Consumer AI, Data, RWA, Other; 2 addr |
| `monad-kinic` | `E-KINIC-REGISTRY-001` | Consumer AI, Storage; 1 addr |
| `monad-mayan` | `E-MAYAN-REGISTRY-001` | Cross Chain, DEX, Intents, Memecoin, Stableswap, Trading Interfaces; 4 addr |
| `monad-memetok` | `E-MEMETOK-REGISTRY-001` | Trading Interfaces, Social, Launchpads; 2 addr |
| `monad-mevx` | `E-MEVX-REGISTRY-001` | Trading Interfaces; 14 addr |
| `monad-mona-trading-bot` | `E-MONA-TRADING-BOT-REGISTRY-001` | Trading Interfaces; 5 addr |
| `monad-openocean` | `E-OPENOCEAN-REGISTRY-001` | DEX, DEX Aggregator, Trading Interfaces, Cross Chain; 1 addr |
| `monad-playkami` | `E-PLAYKAMI-REGISTRY-001` | E-commerce / Ticketing, Other; 4 addr |
| `monad-puffer` | `E-PUFFER-REGISTRY-001` | Liquid Staking, Staking; 1 addr |
| `monad-relay` | `E-RELAY-REGISTRY-001` | Cross Chain; 7 addr |
| `monad-rug-rumble` | `E-RUG-RUMBLE-REGISTRY-001` | Mobile-First, Games, Other; 1 addr |
| `monad-stakestone` | `E-STAKESTONE-REGISTRY-001` | Asset Issuers, Liquid Staking, Stablecoin, Yield; 2 addr |
| `monad-sushiswap` | `E-SUSHISWAP-REGISTRY-001` | DEX Aggregator, DEX; 5 addr |
| `monad-tadle` | `E-TADLE-REGISTRY-001` | Lending, CDP, Launchpads, Liquid Staking, DEX Aggregator, Yield Aggregator, Interoperability, Stablecoin, Yield; 2 addr |
| `monad-wormhole-portal` | `E-WORMHOLE-PORTAL-REGISTRY-001` | Interoperability; 17 addr |
| `monad-trendle` | `E-TRENDLE-REGISTRY-001` | Prediction Market; 2 addr |
| `monad-plabs` | `E-PLABS-REGISTRY-001` | Privacy / Encryption; 2 addr |
| `monad-crsh-market` | `E-CRSH-MARKET-REGISTRY-001` | Prediction Market; 1 addr |
| `monad-collective-memory` | `E-COLLECTIVE-MEMORY-REGISTRY-001` | Social; 5 addr |
| `monad-oripa` | `E-ORIPA-REGISTRY-001` | Games, Marketplace; 5 addr (entry `oripa.cards`) |
| `monad-anomapay` | `E-ANOMAPAY-REGISTRY-001` | Privacy / Encryption, Orchestration; 2 addr |
| `monad-o1-exchange` | `E-O1-EXCHANGE-REGISTRY-001` | Launchpads, DEX Aggregator; 4 addr |
| `monad-accountable` | `E-ACCOUNTABLE-REG-2` | Yield Aggregator; 8 addr |
| `monad-folks-finance-xchain` | `E-FOLKS-FINANCE-XCHAIN-REG-2` | Lending, Cross Chain; 18 addr |
| `monad-gearbox` | `E-GEARBOX-REG-2` | Lending, Leveraged Farming; 26 addr |
| `monad-lfj-poe` | `E-LFJ-POE-REG-2` | DEX, Memecoin; 26 addr |
| `monad-mellow` | `E-MELLOW-REGISTRY-001` | Leveraged Farming, Yield, Yield Aggregator; 52 addr |
| `monad-morpho-blue` | `E-MORPHO-BLUE-REG-2` | Lending; 35 addr |
| `monad-townsquare` | `E-TOWNSQUARE-REGISTRY-001` | Lending, Cross Chain; 15 addr |
### 8.3. Класс C — 75 новых рёбер

Формат тот же: `monad-<projectid>`, `ecosystem_membership`, `Observed`, одна evidence-запись. Source: «DefiLlama protocol registry API» (`https://api.llama.fi/protocols`, capture 2026-09-27). Scope-шаблон: «<Name> listed in the '<категория>' category with a Monad chain entry at the capture instant». Ограничение из limitations записей сохраняется: DefiLlama — сторонний реестр, включение не является официальным эндорсментом Monad.

| Proposed id | evidenceIds | Категория DefiLlama |
| --- | --- | --- |
| `monad-aethonswap` | `E-AETHONSWAP-REG-001` | Dexs |
| `monad-agua` | `E-AGUA-REG-001` | Onchain Capital Allocator |
| `monad-alphagrowth` | `E-ALPHAGROWTH-REG-001` | Risk Curators |
| `monad-atlantis-dex` | `E-ATLANTIS-DEX-REG-001` | Dexs |
| `monad-august-digital` | `E-AUGUST-DIGITAL-REG-001` | Risk Curators |
| `monad-autofinance` | `E-AUTOFINANCE-REG-001` | Yield |
| `monad-brownfi-v2` | `E-BROWNFI-V2-REG-001` | Dexs |
| `monad-clearstar` | `E-CLEARSTAR-REG-001` | Risk Curators |
| `monad-detrade` | `E-DETRADE-REG-001` | Risk Curators |
| `monad-enjoyoors` | `E-ENJOYOORS-REG-001` | CDP |
| `monad-euclid-protocol` | `E-EUCLID-PROTOCOL-REG-001` | Cross Chain Bridge |
| `monad-euler-dao` | `E-EULER-DAO-REG-001` | Risk Curators |
| `monad-fusion-by-ipor` | `E-FUSION-BY-IPOR-REG-001` | Yield Aggregator |
| `monad-gamma-research` | `E-GAMMA-RESEARCH-REG-001` | Risk Curators |
| `monad-ghost-protocol` | `E-GHOST-PROTOCOL-REG-001` | Privacy |
| `monad-gluehook` | `E-GLUEHOOK-REG-001` | Liquidity Automation |
| `monad-hanji-protocol` | `E-HANJI-PROTOCOL-REG-001` | Dexs |
| `monad-huma` | `E-HUMA-REG-001` | RWA |
| `monad-hyperithm` | `E-HYPERITHM-REG-001` | Risk Curators |
| `monad-iziswap` | `E-IZISWAP-REG-001` | Dexs |
| `monad-joe-dex` | `E-JOE-DEX-REG-001` | Dexs |
| `monad-k3-capital` | `E-K3-CAPITAL-REG-001` | Risk Curators |
| `monad-k613` | `E-K613-REG-001` | Lending |
| `monad-layerzero-v2` | `E-LAYERZERO-V2-REG-001` | Bridge |
| `monad-lemonad` | `E-LEMONAD-REG-001` | Dexs |
| `monad-lunarbase` | `E-LUNARBASE-REG-001` | Dexs |
| `monad-madness-finance` | `E-MADNESS-FINANCE-REG-001` | Dexs |
| `monad-metric-v2` | `E-METRIC-V2-REG-001` | Dexs |
| `monad-monad-grid` | `E-MONAD-GRID-REG-001` | Launchpad |
| `monad-moonmace` | `E-MOONMACE-REG-001` | Liquid Staking |
| `monad-mu-digital` | `E-MU-DIGITAL-REG-001` | RWA |
| `monad-murk-finance` | `E-MURK-FINANCE-REG-001` | Privacy |
| `monad-native-lend-curator` | `E-NATIVE-LEND-CURATOR-REG-001` | Risk Curators |
| `monad-near-intents` | `E-NEAR-INTENTS-REG-001` | Bridge |
| `monad-neutral-trade` | `E-NEUTRAL-TRADE-REG-001` | Onchain Capital Allocator |
| `monad-noxa-dex-v2` | `E-NOXA-DEX-V2-REG-001` | Dexs |
| `monad-noxa-fun` | `E-NOXA-FUN-REG-001` | Launchpad |
| `monad-obsdn` | `E-OBSDN-REG-001` | Derivatives |
| `monad-octoswap-cl` | `E-OCTOSWAP-CL-REG-001` | Dexs |
| `monad-ouroboros-capital` | `E-OUROBOROS-CAPITAL-REG-001` | Risk Curators |
| `monad-pangolin-v3` | `E-PANGOLIN-V3-REG-001` | Dexs |
| `monad-parity-dex` | `E-PARITY-DEX-REG-001` | Dexs |
| `monad-peridot` | `E-PERIDOT-REG-001` | Lending |
| `monad-pingu-exchange` | `E-PINGU-EXCHANGE-REG-001` | Derivatives |
| `monad-pinot-v3` | `E-PINOT-V3-REG-001` | Dexs |
| `monad-printr` | `E-PRINTR-REG-001` | Launchpad |
| `monad-purpsexchange` | `E-PURPSEXCHANGE-REG-001` | Dexs |
| `monad-quantus-lend` | `E-QUANTUS-LEND-REG-001` | Lending |
| `monad-reservoir-protocol` | `E-RESERVOIR-PROTOCOL-REG-001` | CDP |
| `monad-rockawayx` | `E-ROCKAWAYX-REG-001` | Risk Curators |
| `monad-sablier-lockup` | `E-SABLIER-LOCKUP-REG-001` | Payments |
| `monad-saffron-vaults` | `E-SAFFRON-VAULTS-REG-001` | Yield |
| `monad-sherpa` | `E-SHERPA-REG-001` | Onchain Capital Allocator |
| `monad-skate-amm` | `E-SKATE-AMM-REG-001` | Dexs |
| `monad-someswap-amm` | `E-SOMESWAP-AMM-REG-001` | Dexs |
| `monad-springx` | `E-SPRINGX-REG-001` | Yield |
| `monad-steakhouse-financial` | `E-STEAKHOUSE-FINANCIAL-REG-001` | Risk Curators |
| `monad-stoneusd` | `E-STONEUSD-REG-001` | CeDeFi |
| `monad-swaap-maker-v2` | `E-SWAAP-MAKER-V2-REG-001` | Dexs |
| `monad-sweep-n-flip` | `E-SWEEP-N-FLIP-REG-001` | NFT Marketplace |
| `monad-swyrl-cl` | `E-SWYRL-CL-REG-001` | Dexs |
| `monad-theo-network-thbill` | `E-THEO-NETWORK-THBILL-REG-001` | RWA |
| `monad-thesauros` | `E-THESAUROS-REG-001` | Yield |
| `monad-travessia-credit` | `E-TRAVESSIA-CREDIT-REG-001` | RWA |
| `monad-tulipa-capital` | `E-TULIPA-CAPITAL-REG-001` | Risk Curators |
| `monad-ultrayield-curator` | `E-ULTRAYIELD-CURATOR-REG-001` | Risk Curators |
| `monad-unified-labs` | `E-UNIFIED-LABS-REG-001` | Risk Curators |
| `monad-unit` | `E-UNIT-REG-001` | Bridge |
| `monad-valos` | `E-VALOS-REG-001` | RWA |
| `monad-veda` | `E-VEDA-REG-001` | Onchain Capital Allocator |
| `monad-vfat-io` | `E-VFAT-IO-REG-001` | Yield Aggregator |
| `monad-vii-finance` | `E-VII-FINANCE-REG-001` | Leveraged Farming |
| `monad-wombat-exchange` | `E-WOMBAT-EXCHANGE-REG-001` | Dexs |
| `monad-y10k-capital` | `E-Y10K-CAPITAL-REG-001` | Risk Curators |
| `monad-zkswap-v2` | `E-ZKSWAP-V2-REG-001` | Dexs |
### 8.4. Класс E — 4 проекта без Monad-presence evidence

`talus` (AI), `nadfun` (Gaming, Nad Arcade), `pixel-forge` (Gaming), `moca` (Identity, Moca Network). У них нет ни одной approved-записи (172 из 176 проектов имеют записи — совпадает с `docs/PROJECT_CONTEXT.md`); их связи в demo-слое (`talus-monad`, `monad-nadfun`, `moca-monad`, `switchboard-pixel-forge`, `nadfun-pixel-forge`, `moca-talus`, `talus-switchboard`) остаются иллюстративными/AI-inferred. Честное состояние: **не соединять**, рёбра не предлагаются. (Не путать: `nad-fun` — класс A, `nadfun` — класс E.)

### 8.5. Размер v8 при полной поставке

- 28 существующих + 166 новых = **194 relationship**; records остаются 217.
- Hybrid-граф: 15 − 4 + 194 = **205 рёбер** (11 demo-рёбер сохраняются).
- Строгая альтернатива (только A+B): 28 + 91 = **119 relationship**, hybrid 130.
- Коллизий proposed id с существующими sourced/demo id нет; ловушка `nad-fun` vs `nadfun` учтена (только `monad-nad-fun`, demo-ребро `monad-nadfun` не трогаем).

## 9. Агрегаты по дистриктам (для линий «дистрикт ↔ Monad»)

Пересчитано по district-полю проектов в `src/main.js` (DeFi 140, Infrastructure 21, Gaming 11, AI 3, Identity 1).

| Дистрикт | Всего | A | B | C | D | E | Покрыто (A+B+C) | Только A+B | Честный лейбл луча |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| DeFi | 140 | 34 | 38 | 68 | 0 | 0 | 140 | 72 | «DeFi ↔ Monad: 140 of 140 projects with sourced Monad records» (strict: 72) |
| Infrastructure | 21 | 3 | 11 | 6 | 1 | 0 | 20 (+ сам monad) | 14 | «Infrastructure ↔ Monad: 20 of 20 non-Monad projects with sourced Monad records» (strict: 14) |
| Gaming | 11 | 1 | 7 | 1 | 0 | 2 | 9 | 8 | «Gaming ↔ Monad: 9 of 11 projects with sourced Monad records» (strict: 8) |
| AI | 3 | 0 | 2 | 0 | 0 | 1 | 2 | 2 | «AI ↔ Monad: 2 of 3 projects with sourced Monad records» (strict: 2) |
| Identity | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | «Identity ↔ Monad: no sourced Monad records yet» (0 of 1) |
| Город | 176 | 38 | 58 | 75 | 1 | 4 | 171 (+ monad) | 96 | «171 of 176 projects with sourced Monad records» (strict: 96) |

Примечания: Infrastructure-знаменатель 20 исключает саму башню `monad`. Identity-луч при текущих данных рисовать нельзя — единственный проект (moca) без записей; показывать «no sourced records» честнее пустого луча. Лейблы не должны формулироваться как «all projects connect to Monad» — это неверно для 4 проектов класса E и завышает силу классов B/C.

## 10. Оценка работы по ревью

**Объём при полной поставке: 166 новых relationship-кандидатов** (A: 35, B: 56, C: 75) + опционально `fastlane-shmonad-asset`. Records не добавляются — все 217 уже в снапшоте, новых evidence-review не нужно.

Проверено по `scripts/evidence-workflow.js` и `src/evidence-contract.js`; v7-рёбра носят ровно этот набор полей. Для каждого relationship-кандидата workflow требует шесть контролируемых полей `reviewMetadata`:

| Поле | Требование (захардкожено в валидаторе) |
| --- | --- |
| `reviewerRef` | `reviewer:r-[0-9a-f]{16}` — непрозрачная ссылка, без имён/организаций |
| `reviewerRole` | жёстко `relationship-reviewer` |
| `reviewedAt` | канонический UTC-инстант, совпадает с subject `reviewedAt` |
| `reviewMethod` | для relationship **единственное допустимое значение** — `manual-relationship-evidence-inspection` |
| `decisionReason` | для approved: `evidence-resolved` или `evidence-resolved-with-limitations` |
| `reviewPolicyVersion` | `phase-3.7-review-policy-v1` |

- **Механическая часть**: 166 × `evidence:prepare --kind relationship` + 166 × `evidence:review --kind relationship --status approved` + один `evidence:validate` → `evidence:snapshot` → `evidence:load` → `evidence:promote`. Команды скриптуются; reviewerRef может быть один на всю партию (это ссылка на решение, не на личность).
- **Человеческая часть**: решение по каждому ребру не наследуется от approval записи. Инспекцию разумно батчить по классам (A — однородные App-Portal-листинги; B — pinned-registry-снапшоты; C — однородные DefiLlama-листинги), но формально это 166 отдельных inspect+decision.
- **Пакетный метод ревью**: предлагаемая формулировка «derivation-from-approved-record-inspection» в текущий валидатор **не пройдёт** — reviewMethod для relationship захардкожен. Варианты: (а) оставить `manual-relationship-evidence-inspection` + `evidence-resolved-with-limitations` — 166 честных решений без изменений кода (рекомендуется); (б) расширить политику новым controlled-значением — требует правок `docs/EVIDENCE_DATA_CONTRACT.md`, `scripts/evidence-workflow.js`, матриц в `src/evidence-contract.js` и явного решения владельца. Метод (б) ослабляет смысл «manual inspection» — не рекомендуется для первой полной поставки.
- **Cadence-последствие**: `ecosystem_membership` имеет собственный интервал 30 дней → due = min(30d, ближайший evidence due). Для A-рёбер basis = supporting-evidence (2026-10-27); для B — evidence 365d (pinned snapshot), значит subject-cadence 30d от инстанта ревью; для C — evidence 30d (mutable URL). Итог: **вся партия ~166 субъектов станет due примерно через 30 дней после ревью** — это постоянная месячная нагрузка на re-review, о которой владелец должен знать заранее.
- **Дедлайн**: раньше всех due 2026-10-22T22:02:32Z (`monad-apriori`, kuru/aPriori-записи, 30-дневный cadence от 2026-09-22). Промоушен v8 нужно завершить до этой даты, либо сначала явно пере-review'ить все due-субъекты. A-рёбра наследуют due 2026-10-27 от MEM-записей.

## 11. Вопросы владельцу

1. **Скоуп поставки**: всё сразу (v8 = 194 relationship, hybrid 205) или строгая очередность — v8 только класс A+B (119 relationship, hybrid 130), класс C отдельным v9 после проверки DefiLlama-записей на свежесть?
2. **`monad-shmonad`**: включать parent-entry-ребро в v8 или отложить до прямой записи `shmonad` в реестре?
3. **`fastlane-shmonad-asset`** (секция 5): внедрять в v8, и если да — утверждённый тип/claimStatus (предложение: `declared_integration` / `Observed`, evidence `E-FASTLANE-REGISTRY-001` + `E-SHMONAD-TOKEN-MAPPING-001`).
4. **Лучи дистриктов**: только агрегированные лучи в City view, или также district↔Monad рёбра в Graph View? Утверждённые лейблы — из секции 9 (формулировка «N of M projects with sourced Monad records», не «all connect»).
5. **Класс D**: после пересчёта пуст для member-рёбер (решения не требует). Подтвердить, что self-edge `monad→monad` не создаётся, и что 4 проекта класса E остаются честно неподключёнными (рекомендация) либо завести на них intake-записи отдельной задачей.
6. **Режим re-review**: принять месячный цикл re-review для ~166 membership-рёбер как стоимость полной поставки, либо сократить скоуп (строгая очередность из п. 1 снижает первую партию до 91).

---

*Метод: все числа получены импортом `APPROVED_EVIDENCE_SNAPSHOT` из `src/evidence-snapshots/phase-3.5-v7.generated.js` через `node --input-type=module` (count-проверки, cadence-функции `src/evidence-contract.js`, regex-извлечение 176 id из `src/main.js`). Снапшот не изменялся; `npm run build` не запускался.*
