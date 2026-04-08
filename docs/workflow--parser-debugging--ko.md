# 파서 디버깅 워크플로

이 문서는 실제 morgue가 올바르게 파싱되었는지 점검할 때 가장 유용했던
실전 루프를 정리한 것이다.

이 문서는 `docs/workflow--qa.md`를 보완한다. 그 문서는 샘플을 수집하는
방법을 설명하고, 이 문서는 그 샘플을 어떻게 검토해서 재현 가능한 parser
작업으로 바꿀지 설명한다.

## 1. 실제 샘플에서 시작하기

먼저 pipeline으로 실제 live morgue를 수집한다.

중요한 것은 정확한 명령어 한 줄이 아니라 샘플의 형태다.

- 여러 서버를 포함할 것
- 필요할 때 stable과 trunk를 함께 커버할 것
- 특정 구간을 강하게 점검하고 싶다면 `--min-xl`, `--species`,
  `--background`, `--god` 같은 필터를 사용할 것
- 깨끗한 리뷰 세트를 원한다면 전용 `--data-dir`를 사용할 것

수집 명령과 각 플래그의 의미는 `docs/workflow--qa.md`를 참고한다.

## 2. 리뷰 페어 내보내기

데이터베이스만 보고 디버깅하지 않는다.

한 번 실행한 뒤에는 성공적으로 파싱된 각 케이스를 리뷰 디렉터리로
내보내고, 각 케이스마다 다음 파일이 있도록 한다.

- `raw.txt`
- `parsed.json`

유용한 디렉터리 구조는 다음과 같다.

```text
apps/pipeline/data/<run-name>/review/<SERVER>/<BUCKET>/<ENDED_AT>__<PLAYER>/
```

목표는 단순하다. raw morgue와 parsed JSON이 나란히 보여야 한다.

## 3. 파일을 직접 읽기

파싱이 맞는지 판단할 때는 처음부터 자동 diff에 기대기보다 파일을 직접
읽는 편이 좋다.

이유:

- morgue에는 `MiFi`, `GrEE`, `PoHs` 같은 축약형이 나온다
- 인벤토리 줄에는 `A - ...: G - ...` 같은 alias prefix가 들어갈 수 있다
- 어떤 섹션은 줄바꿈이 어색하게 걸린다
- 단순한 비교 스크립트는 parser가 맞아도 false positive를 낼 수 있다

자동 비교도 나중에는 유용할 수 있지만, 첫 번째 패스는 실제 파일을 사람이
직접 검토하는 방식이어야 한다.

raw와 parsed 출력이 여전히 애매하다면 추측하지 말고 upstream Crawl 소스를
로컬에서 확인한다.

이 저장소는 그 목적을 위해 선택적으로 `crawl/` git submodule을 유지한다.
아직 초기화하지 않았다면 다음을 실행한다.

```bash
git submodule update --init crawl
```

파서 디버깅 중 특히 유용했던 소스 위치는 다음과 같다.

- `crawl/crawl-ref/source/`
- `crawl/crawl-ref/source/dat/forms/`
- `crawl/crawl-ref/source/mutation-data.h`

이 조회는 꼭 필요할 때만 쓰고, 다음처럼 의미 해석이 필요한 질문에만
사용한다.

- 괄호로 감싼 `A:` 항목이 억제된 trait를 뜻하는지
- 어떤 trait가 form 기반인지, 위치 의존인지
- 현재 form의 속성이 transformation에서 온 것인지, 선천 mutation에서 온 것인지

## 4. 신호가 큰 섹션부터 먼저 비교하기

각 `raw.txt` / `parsed.json` 페어마다 다음 영역을 이 순서로 비교한다.

1. 헤더 요약
   - `species`
   - `speciesVariant`
   - `background`
   - `xl`
   - `AC`, `EV`, `SH`
   - `Str`, `Int`, `Dex`
   - morgue에 표시된 최종 god
2. 장착 아이템
   - weapon / offhand
   - armour slot들
   - Octopode ring 배치
   - talisman과 현재 form
   - Poltergeist의 haunted 또는 melded 상태
3. mutation과 status 줄
   - `A:` mutation
   - relevant한 경우 `@:` form 또는 status 줄
4. spell 섹션
   - memorized spell
   - spell library
   - 긴 spell name의 truncation 복원
   - `Failure = N/A` 또는 그 밖의 특이한 row
5. skills
   - `skills`
   - `effectiveSkills`

이 순서로 보면 대부분의 실제 버그를 빠르게 잡을 수 있다.

## 5. 발견한 내용을 분류하기

뭔가 이상해 보이면 코드를 건드리기 전에 먼저 분류한다.

흔한 경우:

- parser bug
  - raw morgue는 명확하다
  - parsed field가 틀렸거나 빠져 있다
- fetch 문제
  - morgue를 아예 가져오지 못했다
  - pipeline summary에 parser failure가 아닌 실패가 보일 수 있다
- schema 또는 naming 혼동
  - parser 내부 일관성은 맞지만, field name이 오해를 부르기 쉽다
  - 예: 현재 `orb`는 `Orb of Zot`가 아니라 orb-slot equipment를 뜻한다
- comparison tool의 false positive
  - raw에는 축약형이나 줄바꿈이 있다
  - parser는 맞는데 helper script가 잘못 매칭했다

이 분류가 중요한 이유는 첫 번째 경우만 바로 parser 변경으로 이어져야 하기
때문이다.

## 6. 실제 버그를 fixture로 만들기

parser bug가 확인되면:

1. raw morgue를 테스트 fixture에 추가한다
2. 그 morgue를 사용하는 regression test를 추가하거나 갱신한다
3. 버그가 하나의 extractor에 고립되어 있다면 focused regression을 선호한다
4. 출력이 의도적으로 바뀌었다면 golden expected JSON을 갱신한다
5. schema 의미가 바뀌었다면 parser 문서에 동작 변화를 기록한다

수동 재확인만 하고 멈추면 안 된다.

그 케이스를 고치기 위해 코드 변경이 필요했다면, 같은 버그가 나중에 조용히
다시 돌아오지 않도록 그 morgue는 테스트 스위트의 일부가 되어야 한다.

유용한 fixture 위치:

- `fixtures/morgue/focused`
- `fixtures/morgue/full`
- `fixtures/morgue/expected`

유용한 parser 문서:

- `packages/parser/docs/parser_model.md`
- `packages/parser/docs/parser_changelog.md`

## 7. 같은 케이스를 다시 실행하기

버그를 고친 뒤에는 그 버그를 드러냈던 정확히 같은 morgue를 다시 돌린다.

이것이 가장 중요한 질문 하나에 가장 빨리 답하는 방법이다.

- 이 morgue에 대한 parsed output이 실제로 나아졌는가?

그다음 테스트는 두 층으로 실행한다.

1. 방금 추가하거나 수정한 targeted regression
2. 코드 변경이 있었다면 전체 parser 테스트 스위트

두 번째 단계는 extractor 수준의 좁은 수정이어도 중요하다. 작은 parsing
변화가 다른 morgue나 같은 parser의 다른 섹션에 쉽게 영향을 줄 수 있기
때문이다.

도움이 된다면 그 뒤에 live batch를 하나 더 샘플링해도 좋다.

## 8. 왜 이 케이스가 흥미로웠는지 메모 남기기

짧은 메모면 충분한 경우가 많다.

예시:

- `talisman summary overrides inventory state`
- `spell library unusable rows preserved`
- `functional inscriptions separated from free text`
- `manual review confirmed parser was correct; comparison helper was wrong`

이런 메모는 같은 edge case가 반복되기 때문에 이후 QA 패스를 훨씬 빠르게
만들어 준다.

## 작업 원칙

이 프로젝트에서 가장 신뢰할 수 있었던 디버깅 루프는 다음과 같다.

1. live morgue를 수집한다
2. `raw.txt`와 `parsed.json`을 export한다
3. 그 페어를 직접 읽는다
4. 불일치를 분류한다
5. 코드가 바뀌었다면 그 morgue를 regression fixture와 테스트 케이스로 추가한다
6. 그다음에만 parser 코드를 바꾼다
7. 같은 morgue, targeted regression, 전체 parser 테스트를 다시 실행한다

이 루프는 넓은 범위의 자동 diff부터 시작하는 것보다 더 신뢰할 만했다.
Crawl morgue에는 축약형, 줄바꿈, 특수 케이스가 충분히 많아서 무엇이 실제로
잘못되었는지 판단하려면 사람의 직접 확인이 필요한 경우가 많기 때문이다.
