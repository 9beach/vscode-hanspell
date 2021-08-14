# 비주얼 스튜디오 코드 한스펠

[비주얼 스튜디오 코드 한스펠](https://github.com/9beach/vscode-hanspell)(vscode-hanspell)은, (주)다음과 부산대학교 인공지능연구실/(주)나라인포테크의 웹 서비스를 이용해서 한글 맞춤법을 검사하는 [비주얼 스튜디오 코드](https://code.visualstudio.com)용 [익스텐션](https://code.visualstudio.com/docs/editor/extension-marketplace)입니다.

터미널과 커맨드 라인 팬이라면 [hanspell](https://github.com/9beach/hanspell)을 추천합니다.

## 설치

[비주얼 스튜디오 코드 마켓 플레이스](https://marketplace.visualstudio.com/items?itemName=9beach.vscode-hanspell) 또는 비주얼 스튜디오 코드 익스텐션 탭에서 '한스펠'로 검색해서 설치합니다.

## 주요 기능 및 사용법

### 맞춤법 검사

`Ctrl+Shift+P`(macOS `⇧⌘P`) 또는 `F1` 키를 눌러 명령 팔레트에서 맞춤법 검사를 실행합니다. `맞춤법 검사 (다음)`, `맞춤법 검사 (부산대)`, `맞춤법 검사 (다음, 부산대)`, 모두 세 개의 커맨드를 제공하는데, `맞춤법 검사 (다음, 부산대)`는 두 서비스를 한 번에 실행한 뒤 결과를 모아서 보여줍니다.

![commands](https://github.com/9beach/vscode-hanspell/raw/HEAD/images/hanspell-commands.png)

명령 팔레트의 오른쪽, 톱니바퀴 아이콘을 클릭해서 핫키를 지정할 수 있습니다. 맞춤법 검사는 자동으로 실행되지 않으니 핫키 지정을 권합니다.

마우스로 드래그해서 문서의 특정 영역을 선택한 상태라면 해당 영역만 검사합니다. 유용하지만 주의가 필요합니다.

### 맞춤법 교정

맞춤법 검사를 마치면 오류가 의심되는 문자열에 물결 모양의 밑줄이 표시됩니다. `F8` 키를 눌러서 오류로 이동하거나, 해당 문자열을 클릭하면 왼쪽에 녹색 전구가 뜹니다. 이것을 클릭하거나 `Ctrl+.`(macOS `⌘.`) 키를 누르면 추천어를 포함한 교정 메뉴가 뜹니다.

![command actions](https://github.com/9beach/vscode-hanspell/raw/HEAD/images/hanspell-command-actions.png)

`Shift+Alt+.`(macOS `⌥⌘.`) 키를 누르면 메뉴를 띄우지 않고 자동으로 교정하며, 다시 `F8` 키를 누르면 그다음 오류로 이동합니다.

`맞춤법 검사 (다음, 부산대)` 커맨드는 두 서비스가 공통으로 발견한 오류와 한 서비스만 발견한 오류를, 각각 오렌지색(Warning)과 파란색(Information)으로 구분해서 표시합니다. 다른 두 커맨드는 모두 오렌지색으로 표시합니다.

### 맞춤법 오류 정보

마우스를 밑줄 위로 옮기면 맞춤법 오류 정보가 뜹니다. `Ctrl+Shift+M`(macOS `⇧⌘M`) 키를 눌러 결과 창에서 한눈에 볼 수도 있습니다. (주)다음의 서비스에 비해 맞춤법 오류 정보가 충실하다는 점은 부산대 서비스의 장점입니다만 접속 장애가 잦다는 단점도 있습니다.

![message](https://github.com/9beach/vscode-hanspell/raw/HEAD/images/hanspell-problems.png)

### 히스토리 파일

`~/.hanspell-history` 파일에는 맞춤법 교정 내용이 기록됩니다. 교정 메뉴나 `Shift+Alt+.` 키를 이용하지 않고 직접 수정한 것은 기록되지 않습니다.

```txt
내노라하는 -> 내로라하는
전세계 -> 전 세계
그 뿐만 -> 그뿐만
때 마다 -> 때마다
했는 지 -> 했는지
...
```

아래는 사용자가 자주 틀리는 맞춤법을 빈도순으로 보여주는 셸 스크립트입니다. 리눅스나 macOS 환경에서만 작동합니다.

```console
$ sort < ~/.hanspell-history | uniq -c | sort -nr | head -n 5
  17 모래속에 -> 모래 속에
  13 그 뿐만 -> 그뿐만
  13 했는 지 -> 했는지
  13 한바퀴 -> 한 바퀴
   7 내노라하는 -> 내로라하는
```

`.hanspell-history` 크기가 10MB를 넘으면 `.hanspell-history.N`(`N`은 1, 2, 3...)으로 백업한 뒤 새로 만듭니다.

### 사용자 맞춤법 정의

맞춤법 검사 뒤 같은 오류를 반복하면 자동으로 밑줄이 표시됩니다. 새로 검사하기 전에는 이전 결과로 계속 분석하기 때문입니다. 아래와 같이 `~/.hanspell-typos` 파일에 맞춤법을 정의하면 이전 검사에서 발견한 오류인 것처럼 자동으로 분석해 줍니다.

```txt
그 뿐만 -> 그뿐만
했는 지 -> 했는지
했을뿐 -> 했을 뿐
금새 -> 금세
익숙치 -> 익숙지
```

아래는 자주 틀리는 맞춤법 20개로 `~/.hanspell-typos` 파일을 만드는 셸 스크립트입니다.

```bash
sort < ~/.hanspell-history | uniq -c | sort -nr | head -n 20 | sed -e 's:^  *[0-9][0-9]* \(.*\):\1:' > ~/.hanspell-typos
```

### 맞춤법 검사 제외 문자열 지정

`톨스토이`를 `톨스또이`로 쓰되 맞춤법 검사는 피하고 싶다면 홈 디렉터리에 `.hanspell-ignore` 파일을 만들고 `톨스또이*`를 추가하세요.

```txt
톨스또이*
이딸리아
```

이제 `톨스또이`, `톨스토이가` 등 `톨스또이`로 시작하는 것은 맞춤법 오류에서 제외하고 표시합니다. 반면 `이딸리아`는 제외하지만 `이딸리아에서`는 오류로 표시합니다.

`.hanspell-ignore`는 [글로브 패턴](<https://ko.wikipedia.org/wiki/글로브_(프로그래밍)>)(`globstar` 포함)을 지원합니다. 맞춤법 검사에서 URL을 제외하고 싶다면 다음을 추가하세요.

```txt
*http*/**
```

## 알려진 문제점

버그와 개선점은 [이슈 트래커](https://github.com/9beach/vscode-hanspell/issues)에 올려주세요.

### 중첩된 맞춤법 오류에 의한 `맞춤법 오류 모두 교정` 커맨드 실패

맞춤법 오류는 중첩될 때가 가끔 있습니다. 예를 들어 `abc def ghi...`와 같은 문장에서, `abc def`와 `def`가 모두 맞춤법 오류로 판명되었다면 `def`는 두 오류에 걸쳐 있게 됩니다. 이런 식으로 복잡하게 얽혀서 `맞춤법 오류 모두 교정` 커맨드가 실패할 때가 있습니다. 하나씩 교정하면 제대로 작동합니다.

### 긴 문장 교정 시 부산대 맞춤법 서비스의 잦은 접속 오류

서버 제약으로 긴 문장은 짧은 문장 여러 개로 나누어 요청합니다. 부산대 서비스는 이런 경우 접속 오류가 잦습니다.
