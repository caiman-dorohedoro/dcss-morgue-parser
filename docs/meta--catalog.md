# 메타 카탈로그

작성일: 2026-04-07  
최종 업데이트: 2026-04-07

## 목적

- 현재 monorepo `dcss-morgue-parser`의 문서와 핵심 참조 파일 위치를 한 문서에서 관리한다.
- parser 패키지 문서와 pipeline/QA 문서를 분리하되, 읽는 순서는 한 곳에서 안내한다.
- 새 세션이나 새 저장소에서 작업을 시작할 때 어디서부터 읽어야 할지 빠르게 알려준다.

## 네이밍 규칙

- 루트 문서:
  - `README.md`: 저장소 개요와 workspace 사용법
  - `AGENTS.md`: 작업 지침
- `docs/` 아래 문서:
  - 모두 소문자 파일명 사용
  - `*_origin.md`: 설계 배경과 provenance
  - `*_workflow.md`: 반복 운영/검수 절차
  - `*_strategy.md`: 테스트/fixture 유지 전략
  - `*_notes.md`: 구현 메모와 엔지니어링 판단
- `packages/parser/docs/` 아래 문서:
  - parser 라이브러리의 현재 contract와 변경 이력

## 현재 파일 목록

| 파일명 | 간략 설명 | 위치 |
| --- | --- | --- |
| `README.md` | monorepo 개요, workspace 구조, 대표 명령 | `/` |
| `AGENTS.md` | 작업 지침과 문서 진입점 안내 | `/` |
| `meta--catalog.md` | 문서 메타 인덱스와 읽기 순서 안내 | `/docs` |
| `pipeline_origin.md` | xlog discovery + morgue parsing 분리, politeness, strict failure 같은 pipeline 설계 배경 | `/docs` |
| `raw_morgue_collection.md` | public Crawl 서버에서 raw morgue를 수집하고 QA 샘플을 만든 provenance 문서 | `/docs` |
| `qa_workflow.md` | bootstrap, `--min-xl`, review export, 수동 비교 중심의 실제 parser QA 절차 | `/docs` |
| `fixture_strategy.md` | full morgue golden fixture와 extractor unit test를 함께 쓰는 이유와 운영 방식 | `/docs` |
| `implementation_notes.md` | 초기 구현 계획에서 지금도 유효한 엔지니어링 메모를 추린 문서 | `/docs` |
| `parser_model.md` | 현재 parser 스키마와 Crawl source 기반 모델 설명 | `/packages/parser/docs` |
| `parser_changelog.md` | parser 모델이 어떻게 바뀌었는지와 그 이유를 기록한 변경 이력 | `/packages/parser/docs` |

## 권장 읽기 순서

1. `README.md`
2. `packages/parser/README.md`
3. `packages/parser/docs/parser_model.md`
4. `packages/parser/docs/parser_changelog.md`
5. `docs/pipeline_origin.md`
6. `docs/raw_morgue_collection.md`
7. `docs/qa_workflow.md`
8. `docs/fixture_strategy.md`
9. `docs/implementation_notes.md`

## 문서 상태 메모

- `packages/parser/docs/parser_model.md`와 `packages/parser/docs/parser_changelog.md`는 parser contract를 설명하는 핵심 문서다.
- `docs/pipeline_origin.md`와 `docs/raw_morgue_collection.md`는 parser 바깥 provenance를 설명하는 보조 문서다.
- `docs/implementation_notes.md`는 historical implementation plan을 그대로 보존한 것이 아니라, 지금도 유효한 판단만 추린 편집본이다.

## 정리 이력

- 2026-04-07: parser-only 문서 세트를 monorepo 기준 카탈로그로 재구성했다.
