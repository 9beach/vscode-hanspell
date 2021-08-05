# 비주얼 스튜디오 코드 한스펠

[비주얼 스튜디오 코드 한스펠](https://github.com/9beach/vscode-hanspell)(vscode-hanspell)은, (주)다음과 부산대학교 인공지능연구실/(주)나라인포테크의 웹 서비스를 이용해서 한글 맞춤법을 검사하는 [비주얼 스튜디오 코드](https://code.visualstudio.com)용 [익스텐션](https://code.visualstudio.com/docs/editor/extension-marketplace)입니다.

터미널과 커맨드 라인 팬이라면 [hanspell](https://github.com/9beach/hanspell)을 추천합니다.

## 설치

[비주얼 스튜디오 코드 마켓 플레이스](https://marketplace.visualstudio.com/items?itemName=9beach.vscode-hanspell) 또는 비주얼 스튜디오 코드 익스텐션 탭에서 '한스펠'로 검색해서 설치합니다.

## 주요 기능 및 사용법

### 맞춤법 검사

아래의 그림과 같이 명령 팔레트(`⇧⌘P` 또는 `F1`)에서 맞춤법 검사를 실행합니다. `맞춤법 검사 (다음)`, `맞춤법 검사 (부산대)`, `맞춤법 검사 (다음, 부산대)`, 모두 세 개의 커맨드를 제공하는데, `맞춤법 검사 (다음, 부산대)`는 두 서비스를 한 번에 실행한 뒤 결과를 모아서 보여줍니다.

![commands](https://github.com/9beach/vscode-hanspell/raw/HEAD/images/hanspell-commands.png)

명령 팔레트의 오른쪽, 톱니바퀴 아이콘을 클릭해서 핫키를 지정할 수 있습니다. 맞춤법 검사는 자동으로 실행되지 않으니 핫키를 권합니다.

마우스로 드래그해서 문서의 특정 영역을 선택한 상태라면 해당 영역만 검사합니다. 유용하지만 주의가 필요합니다.

### 맞춤법 교정

맞춤법 검사를 마치면 오류가 의심되는 문자열에 붉은 밑줄이 생깁니다. 해당 문자열을 클릭하면 왼쪽에 녹색 전구가 생기고, 다시 이것을 클릭하면 아래와 같이 추천 단어와 `맞춤법 오류 모두 교정` 메뉴가 뜹니다.

![command actions](https://github.com/9beach/vscode-hanspell/raw/HEAD/images/hanspell-command-actions.png)

### 맞춤법 오류 정보

마우스를 붉은 밑줄 위로 옮기면 맞춤법 오류 정보가 뜹니다. 아래와 같이 결과 창(`⇧⌘M`)에서 한눈에 볼 수도 있습니다. (주)다음의 서비스에 비해 맞춤법 오류 정보가 충실하다는 점은 부산대 서비스의 장점입니다만 접속 장애가 잦다는 단점도 있습니다.

![message](https://github.com/9beach/vscode-hanspell/raw/HEAD/images/hanspell-problems.png)

### 맞춤법 검사 제외 단어 지정

`톨스토이`를 `톨스또이`로 쓰되 맞춤법 검사는 피하고 싶다면 홈 디렉터리에 `.hanspell-ignore` 파일을 만들고 `톨스또이*`를 등록하세요.

```txt
톨스또이*
이딸리아
```

위와 같이 등록하면 맞춤법 오류 중 `톨스또이`, `톨스토이가` 등 `톨스또이`로 시작하는 것은 제외하고 표시합니다. 반면 `이딸리아`는 제외하지만 `이딸리아에서`는 오류로 표시합니다.

`.hanspell-ignore`는 [글로브 패턴](<https://ko.wikipedia.org/wiki/글로브_(프로그래밍)>)을 지원합니다. 마크다운 문법과 URL, 영어 등을 맞춤법 검사에서 제외하고 싶다면 아래의 예를 참고하세요.

```txt
[-\!`[a-zA-Z0-9:<>]*[[a-zA-Z0-9:<>]*
.[-\!`[a-zA-Z0-9:<>]*[[a-zA-Z0-9:<>]*
*[-\!`[a-zA-Z0-9:<>]*[[a-zA-Z0-9:<>]*/**
*[-\!`[a-zA-Z0-9:<>]*[[a-zA-Z0-9:<>]*/.**
```

## 알려진 문제점

버그와 개선점은 [이슈 트래커](https://github.com/9beach/vscode-hanspell/issues)에 올려주세요.

### 중첩된 맞춤법 오류에 의한 `맞춤법 오류 모두 교정` 커맨드 실패

가끔 맞춤법 오류가 중첩될 때가 있습니다. `abc def ghi...`와 같은 문장에서, `abc def`와 `def`가 모두 맞춤법 오류로 판명되었다면 `def`는 두 오류에 걸쳐 있게 됩니다. 이런 식으로 복잡하게 얽혀서 `맞춤법 오류 모두 교정` 커맨드가 실패할 때가 있습니다. 한 단어씩 교정하면 제대로 작동합니다.

### 긴 문장 교정 시 부산대 맞춤법 서비스의 잦은 접속 오류

서버 제약으로, 긴 문장은 짧은 문장 여러 개로 나누어 요청합니다. 이 중 하나라도 실패하면 교정 결과를 보여주지 않습니다. 맞춤법 오류 가능성이 있는데도 모르고 지나치는 경우를 막기 위해서입니다. 부산대 서비스는 이런 접속 오류가 특히 잦은 편입니다만, `맞춤법 검사 (다음, 부산대)` 커맨드는 두 서비스 중 하나라도 모든 요청이 성공하면 부분적으로 성공한 요청까지 모아서 교정 결과를 보여주어 유용합니다.
