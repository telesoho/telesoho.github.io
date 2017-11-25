---
title: MFCC
tags:  [MFCC, 快速傅里叶变换, 信号处理]
layout: post
description: 
comments: true
categories: Python
published: false
mathjax: true
date: 2017-11-20 20:34:01 +0900
---

<div class="entry-content">

[Pythonで音声信号処理](/entry/20110514/1305377659)（2011/05/14）の第19回目。

今回は、音声認識の特徴量としてよく見かける**メル周波数ケプストラム係数**（Mel-Frequency Cepstrum Coefficients）を求めてみました。いわゆる**MFCC**です。

MFCCは[ケプストラム](/entry/20120211/1328964624)（2012/2/11）と同じく声道特性を表す特徴量です。ケプストラムとMFCCの違いはMFCCが人間の音声知覚の特徴を考慮していることです。**メル**という言葉がそれを表しています。

MFCCの抽出手順をまとめると

1.  プリエンファシスフィルタで波形の高域成分を強調する
2.  窓関数をかけた後にFFTして振幅スペクトルを求める
3.  振幅スペクトルにメルフィルタバンクをかけて圧縮する
4.  上記の圧縮した数値列を信号とみなして離散コサイン変換する
5.  得られたケプストラムの低次成分がMFCC

となります。私が参考にしたコードは振幅スペクトルを使ってたけど、Wikipediaの説明を見るとパワーと書いてある。パワースペクトルの方がいいのかな？

ケプストラム分析と違うのは

*   振幅スペクトルにメルフィルタバンクをかけて圧縮する
*   ケプストラム領域に移すのにフーリエ変換ではなく、離散コサイン変換を使う

の2点であとはだいたい一緒のようです。というわけでこの手順にそってPythonで実装していきたいと思います。

[mfcc.py](https://github.com/aidiary/signal_processing/blob/master/mfcc.py)  

<div class="section">

### 音声信号

まず、音声信号を用意します。ケプストラム分析で使った「あ」の音の中心の定常部分をロードします。

<audio src="https://raw.githubusercontent.com/aidiary/signal_processing/master/sounds/a.wav" controls="">音声を再生するには、audioタグをサポートしたブラウザが必要です。</audio>

<pre class="code lang-python" data-lang="python" data-unlink=""><span class="synComment">#coding:utf-8</span>

<span class="synPreProc">import</span> wave

<span class="synPreProc">import</span> numpy <span class="synStatement">as</span> np

<span class="synPreProc">from</span> pylab <span class="synPreProc">import</span> *

<span class="synStatement">def</span> <span class="synIdentifier">wavread</span>(filename):

    wf = wave.<span class="synIdentifier">open</span>(filename, <span class="synConstant">"r"</span>)

    fs = wf.getframerate()

    x = wf.readframes(wf.getnframes())

    x = np.frombuffer(x, dtype=<span class="synConstant">"int16"</span>) / <span class="synConstant">32768.0</span>  <span class="synComment"># (-1, 1)に正規化</span>

    wf.close()

    <span class="synStatement">return</span> x, <span class="synIdentifier">float</span>(fs)

<span class="synStatement">if</span> __name__ == <span class="synConstant">"__main__"</span>:

    <span class="synComment"># 音声をロード</span>

    wav, fs = wavread(<span class="synConstant">"a.wav"</span>)

    t = np.arange(<span class="synConstant">0.0</span>, <span class="synIdentifier">len</span>(wav) / fs, <span class="synConstant">1</span>/fs)

    <span class="synComment"># 音声波形の中心部分を切り出す</span>

    center = <span class="synIdentifier">len</span>(wav) / <span class="synConstant">2</span>  <span class="synComment"># 中心のサンプル番号</span>

    cuttime = <span class="synConstant">0.04</span>         <span class="synComment"># 切り出す長さ [s]</span>

    wavdata = wav[center - cuttime/<span class="synConstant">2</span>*fs : center + cuttime/<span class="synConstant">2</span>*fs]

    time = t[center - cuttime/<span class="synConstant">2</span>*fs : center + cuttime/<span class="synConstant">2</span>*fs]

    <span class="synComment"># 波形をプロット</span>

    plot(time * <span class="synConstant">1000</span>, wavdata)

    xlabel(<span class="synConstant">"time [ms]"</span>)

    ylabel(<span class="synConstant">"amplitude"</span>)

    savefig(<span class="synConstant">"waveform.png"</span>)

    show()

</pre>

実行結果は、

<span itemscope="" itemtype="http://schema.org/Photograph">![f:id:aidiary:20120225212301p:plain](https://cdn-ak.f.st-hatena.com/images/fotolife/a/aidiary/20120225/20120225212301.png "f:id:aidiary:20120225212301p:plain")</span>  

</div>

<div class="section">

### プリエンファシスフィルタ

次にスペクトルの高域成分を強調する**プリエンファシスフィルタ**（pre-emphasis filter）をかけます。高域成分を強調することで声道特徴がはっきり出るため使った方がよいとのこと。プリエンファシスフィルタの定義は、

<span class="MathJax_Preview" style="color: inherit;"></span><span class="MathJax" id="MathJax-Element-1-Frame" tabindex="0" data-mathml="<math xmlns=&quot;http://www.w3.org/1998/Math/MathML&quot;><nobr aria-hidden="true"><span class="math" id="MathJax-Span-1" role="math" style="width: 12.956em; display: inline-block;"><span style="display: inline-block; position: relative; width: 10.436em; height: 0px; font-size: 124%;"><span style="position: absolute; clip: rect(1.464em 1010.34em 2.775em -999.997em); top: -2.366em; left: 0.003em;"><span class="mrow" id="MathJax-Span-2"><span class="mi" id="MathJax-Span-3" style="font-family: MathJax_Math-italic;">y<span style="display: inline-block; overflow: hidden; height: 1px; width: 0.003em;"></span></span><span class="mo" id="MathJax-Span-4" style="font-family: MathJax_Main;">(</span><span class="mi" id="MathJax-Span-5" style="font-family: MathJax_Math-italic;">n</span><span class="mo" id="MathJax-Span-6" style="font-family: MathJax_Main;">)</span><span class="mo" id="MathJax-Span-7" style="font-family: MathJax_Main; padding-left: 0.305em;">=</span><span class="mi" id="MathJax-Span-8" style="font-family: MathJax_Math-italic; padding-left: 0.305em;">x</span><span class="mo" id="MathJax-Span-9" style="font-family: MathJax_Main;">(</span><span class="mi" id="MathJax-Span-10" style="font-family: MathJax_Math-italic;">n</span><span class="mo" id="MathJax-Span-11" style="font-family: MathJax_Main;">)</span><span class="mo" id="MathJax-Span-12" style="font-family: MathJax_Main; padding-left: 0.204em;">−</span><span class="mi" id="MathJax-Span-13" style="font-family: MathJax_Math-italic; padding-left: 0.204em;">p</span><span class="mi" id="MathJax-Span-14" style="font-family: MathJax_Math-italic;">x</span><span class="mo" id="MathJax-Span-15" style="font-family: MathJax_Main;">(</span><span class="mi" id="MathJax-Span-16" style="font-family: MathJax_Math-italic;">n</span><span class="mo" id="MathJax-Span-17" style="font-family: MathJax_Main; padding-left: 0.204em;">−</span><span class="mn" id="MathJax-Span-18" style="font-family: MathJax_Main; padding-left: 0.204em;">1</span><span class="mo" id="MathJax-Span-19" style="font-family: MathJax_Main;">)</span></span><span style="display: inline-block; width: 0px; height: 2.371em;"></span></span></span><span style="display: inline-block; overflow: hidden; vertical-align: -0.372em; border-left: 0px solid; width: 0px; height: 1.378em;"></span></span></nobr><span class="MJX_Assistive_MathML" role="presentation"><math xmlns="http://www.w3.org/1998/Math/MathML"><mi>y</mi><mo stretchy="false">(</mo><mi>n</mi><mo stretchy="false">)</mo><mo>=</mo><mi>x</mi><mo stretchy="false">(</mo><mi>n</mi><mo stretchy="false">)</mo><mo>−</mo><mi>p</mi><mi>x</mi><mo stretchy="false">(</mo><mi>n</mi><mo>−</mo><mn>1</mn><mo stretchy="false">)</mo></math></span><mi>y</mi><mo stretchy=&quot;false&quot;>(</mo><mi>n</mi><mo stretchy=&quot;false&quot;>)</mo><mo>=</mo><mi>x</mi><mo stretchy=&quot;false&quot;>(</mo><mi>n</mi><mo stretchy=&quot;false&quot;>)</mo><mo>&amp;#x2212;</mo><mi>p</mi><mi>x</mi><mo stretchy=&quot;false&quot;>(</mo><mi>n</mi><mo>&amp;#x2212;</mo><mn>1</mn><mo stretchy=&quot;false&quot;>)</mo></math>" role="presentation" style="position: relative;"></span><script type="math/tex" id="MathJax-Element-1">y(n) = x(n) - p x(n - 1)</script>

ここで、x(n)は音声波形データ、pはプリエンファシス係数。0.97を使うことが多いとのこと。

上記の式は、フィルタ係数が [1.0, -p] の[FIRフィルタ](/entry/20111023/1319334639)（2011/10/23）と同じです。FIRフィルタの定義式に上のフィルタ係数を代入するとプリエンファシスフィルタの式と同じになることが確認できます。Pythonだとlfilter()を使って下のように実装できます。

<pre class="code lang-python" data-lang="python" data-unlink=""><span class="synPreProc">import</span> scipy.signal

<span class="synStatement">def</span> <span class="synIdentifier">preEmphasis</span>(signal, p):

    <span class="synConstant">"""プリエンファシスフィルタ"""</span>

    <span class="synComment"># 係数 (1.0, -p) のFIRフィルタを作成</span>

    <span class="synStatement">return</span> scipy.signal.lfilter([<span class="synConstant">1.0</span>, -p], <span class="synConstant">1</span>, signal)

<span class="synComment"># プリエンファシスフィルタをかける</span>

p = <span class="synConstant">0.97</span>         <span class="synComment"># プリエンファシス係数</span>

signal = preEmphasis(signal, p)

</pre>

実際にプリエンファシスフィルタをかけた波形とそのスペクトルを表示してみました。左上がもとの波形、右上がフィルタをかけた波形。左下がもとの波形のスペクトル、右下がフィルタをかけた波形のスペクトルです。プリエンファシスフィルタをかけることで高域成分が強調されているのがよくわかります。

<span itemscope="" itemtype="http://schema.org/Photograph">![f:id:aidiary:20120225214246p:plain](https://cdn-ak.f.st-hatena.com/images/fotolife/a/aidiary/20120225/20120225214246.png "f:id:aidiary:20120225214246p:plain")</span>  

</div>

<div class="section">

### 振幅スペクトル

次にプリエンファシスフィルタをかけた波形にハミング窓をかけてからFFTして振幅スペクトルを求めます。さっきのはハミング窓かけてませんでした。

<pre class="code lang-python" data-lang="python" data-unlink="">    <span class="synComment"># ハミング窓をかける</span>

    hammingWindow = np.hamming(<span class="synIdentifier">len</span>(signal))

    signal = signal * hammingWindow

    <span class="synComment"># 振幅スペクトルを求める</span>

    nfft = <span class="synConstant">2048</span>  <span class="synComment"># FFTのサンプル数</span>

    spec = np.<span class="synIdentifier">abs</span>(np.fft.fft(signal, nfft))[:nfft/<span class="synConstant">2</span>]

    fscale = np.fft.fftfreq(nfft, d = <span class="synConstant">1.0</span> / fs)[:nfft/<span class="synConstant">2</span>]

    <span class="synComment"># プロット</span>

    plot(fscale, spec)

    xlabel(<span class="synConstant">"frequency [Hz]"</span>)

    ylabel(<span class="synConstant">"amplitude spectrum"</span>)

    savefig(<span class="synConstant">"spectrum.png"</span>)

    show()

</pre>

<span itemscope="" itemtype="http://schema.org/Photograph">![f:id:aidiary:20120225215326p:plain](https://cdn-ak.f.st-hatena.com/images/fotolife/a/aidiary/20120225/20120225215326.png "f:id:aidiary:20120225215326p:plain")</span>  

</div>

<div class="section">

### メルフィルタバンクの作成

次、メルフィルタバンクを作成します。フィルタバンクというのは[バンドパスフィルタ](/entry/20111030/1319895630)（2011/10/30）を複数並べたものです。ここでは、三角形のバンドパスフィルタをオーバーラップさせながら並べます。三角形のバンドパスフィルタの数をチャネル数と呼びます。

ここでただのフィルタバンクではなく、メルがつくのが特徴です。メル尺度は、人間の音声知覚を反映した周波数軸で単位はmelです。**低周波ほど間隔が狭く、高周波ほど間隔が広くなっています。**どうやら人間は低周波なら細かい音の高さの違いがわかるけれど、高周波になるほど音の高さの違いがわからなくなるようです。詳しい説明は参考文献にゆずるとしてHzとmelを相互変換する関数を実装します。

<pre class="code lang-python" data-lang="python" data-unlink=""><span class="synStatement">def</span> <span class="synIdentifier">hz2mel</span>(f):

    <span class="synConstant">"""Hzをmelに変換"""</span>

    <span class="synStatement">return</span> <span class="synConstant">1127.01048</span> * np.log(f / <span class="synConstant">700.0</span> + <span class="synConstant">1.0</span>)

<span class="synStatement">def</span> <span class="synIdentifier">mel2hz</span>(m):

    <span class="synConstant">"""melをhzに変換"""</span>

    <span class="synStatement">return</span> <span class="synConstant">700.0</span> * (np.exp(m / <span class="synConstant">1127.01048</span>) - <span class="synConstant">1.0</span>)

</pre>

メルフィルタバンクは、バンドパスフィルタの三角窓が**メル尺度上で**等間隔になるように配置されます。メル尺度上で等間隔にならべたフィルタをHz尺度に戻すと高周波になるほど幅が広い三角形になります。下の図のようなイメージです。

<span itemscope="" itemtype="http://schema.org/Photograph">![f:id:aidiary:20120225215327p:plain](https://cdn-ak.f.st-hatena.com/images/fotolife/a/aidiary/20120225/20120225215327.png "f:id:aidiary:20120225215327p:plain")</span>

メルフィルタバンクを作る関数です。

<pre class="code lang-python" data-lang="python" data-unlink=""><span class="synStatement">def</span> <span class="synIdentifier">melFilterBank</span>(fs, nfft, numChannels):

    <span class="synConstant">"""メルフィルタバンクを作成"""</span>

    <span class="synComment"># ナイキスト周波数（Hz）</span>

    fmax = fs / <span class="synConstant">2</span>

    <span class="synComment"># ナイキスト周波数（mel）</span>

    melmax = hz2mel(fmax)

    <span class="synComment"># 周波数インデックスの最大数</span>

    nmax = nfft / <span class="synConstant">2</span>

    <span class="synComment"># 周波数解像度（周波数インデックス1あたりのHz幅）</span>

    df = fs / nfft

    <span class="synComment"># メル尺度における各フィルタの中心周波数を求める</span>

    dmel = melmax / (numChannels + <span class="synConstant">1</span>)

    melcenters = np.arange(<span class="synConstant">1</span>, numChannels + <span class="synConstant">1</span>) * dmel

    <span class="synComment"># 各フィルタの中心周波数をHzに変換</span>

    fcenters = mel2hz(melcenters)

    <span class="synComment"># 各フィルタの中心周波数を周波数インデックスに変換</span>

    indexcenter = np.<span class="synIdentifier">round</span>(fcenters / df)

    <span class="synComment"># 各フィルタの開始位置のインデックス</span>

    indexstart = np.hstack(([<span class="synConstant">0</span>], indexcenter[<span class="synConstant">0</span>:numChannels - <span class="synConstant">1</span>]))

    <span class="synComment"># 各フィルタの終了位置のインデックス</span>

    indexstop = np.hstack((indexcenter[<span class="synConstant">1</span>:numChannels], [nmax]))

    filterbank = np.zeros((numChannels, nmax))

    <span class="synStatement">for</span> c <span class="synStatement">in</span> np.arange(<span class="synConstant">0</span>, numChannels):

        <span class="synComment"># 三角フィルタの左の直線の傾きから点を求める</span>

        increment= <span class="synConstant">1.0</span> / (indexcenter[c] - indexstart[c])

        <span class="synStatement">for</span> i <span class="synStatement">in</span> np.arange(indexstart[c], indexcenter[c]):

            filterbank[c, i] = (i - indexstart[c]) * increment

        <span class="synComment"># 三角フィルタの右の直線の傾きから点を求める</span>

        decrement = <span class="synConstant">1.0</span> / (indexstop[c] - indexcenter[c])

        <span class="synStatement">for</span> i <span class="synStatement">in</span> np.arange(indexcenter[c], indexstop[c]):

            filterbank[c, i] = <span class="synConstant">1.0</span> - ((i - indexcenter[c]) * decrement)

    <span class="synStatement">return</span> filterbank, fcenters

<span class="synComment"># メルフィルタバンクを作成</span>

numChannels = <span class="synConstant">20</span>  <span class="synComment"># メルフィルタバンクのチャネル数</span>

df = fs / nfft   <span class="synComment"># 周波数解像度（周波数インデックス1あたりのHz幅）</span>

filterbank, fcenters = melFilterBank(fs, nfft, numChannels)

<span class="synComment"># メルフィルタバンクのプロット</span>

<span class="synStatement">for</span> c <span class="synStatement">in</span> np.arange(<span class="synConstant">0</span>, numChannels):

    plot(np.arange(<span class="synConstant">0</span>, nfft / <span class="synConstant">2</span>) * df, filterbank[c])

savefig(<span class="synConstant">"melfilterbank.png"</span>)

show()

</pre>

ここで戻り値のfilterbankは行列です。各行が1つのバンドパスフィルタ（三角形）にあたります。音声認識では、20個のバンドパスフィルタを使うことが多いそうです。つまり、20チャネルのフィルタバンクです。また、列数は、FFTのサンプル数（nfft）を2048にしているので、ナイキスト周波数までの半分をとると1024になります。

<pre class="code lang-python" data-lang="python" data-unlink=""><span class="synIdentifier">print</span> filterbank.shape

</pre>

とやると(20, 1024)が返ってきます。

</div>

<div class="section">

### メルフィルタバンクをかける

次に、先の振幅スペクトルにメルフィルタバンクをかけます。振幅スペクトルに対してメルフィルタバンクの各フィルタをかけ、フィルタ後の振幅を足し合わせて対数をとります。言葉で書くとややこしいんだけれどコードだとはっきりします。

<pre class="code lang-python" data-lang="python" data-unlink="">    <span class="synComment"># 振幅スペクトルに対してフィルタバンクの各フィルタをかけ、</span>

    <span class="synComment"># 振幅の和の対数をとる</span>

    mspec = []

    <span class="synStatement">for</span> c <span class="synStatement">in</span> np.arange(<span class="synConstant">0</span>, numChannels):

        mspec.append(np.log10(<span class="synIdentifier">sum</span>(spec * filterbank[c])))

    mspec = np.array(mspec)

</pre>

実は、forループで書かなくても下のように行列のかけ算を使うともっと簡潔にかけます。フィルタをかけて振幅を足し合わせるというのは内積で表せるためです。

<pre class="code lang-python" data-lang="python" data-unlink="">    <span class="synComment"># 振幅スペクトルにメルフィルタバンクを適用</span>

    mspec = np.log10(np.dot(spec, filterbank.T))

</pre>

どっちの方法でも同じ結果になります。これをすると振幅スペクトルがメルフィルタバンクのチャネル数と同じ次元に圧縮されます。今回は、チャネル数20なので20次元のデータになります。元の対数振幅スペクトルとメルフィルタバンクで20次元データをプロットしてみると下のようになります。

<span itemscope="" itemtype="http://schema.org/Photograph">![f:id:aidiary:20120225225722p:plain](https://cdn-ak.f.st-hatena.com/images/fotolife/a/aidiary/20120225/20120225225722.png "f:id:aidiary:20120225225722p:plain")</span>  

<pre class="code lang-python" data-lang="python" data-unlink="">    <span class="synComment"># 元の振幅スペクトルとフィルタバンクをかけて圧縮したスペクトルを表示</span>

    subplot(<span class="synConstant">211</span>)

    plot(fscale, np.log10(spec))

    xlabel(<span class="synConstant">"frequency"</span>)

    xlim(<span class="synConstant">0</span>, <span class="synConstant">25000</span>)

    subplot(<span class="synConstant">212</span>)

    plot(fcenters, mspec, <span class="synConstant">"o-"</span>)

    xlabel(<span class="synConstant">"frequency"</span>)

    xlim(<span class="synConstant">0</span>, <span class="synConstant">25000</span>)

    show()

</pre>

</div>

<div class="section">

### 離散コサイン変換

最後にこの20次元のデータを離散コサイン変換してケプストラム領域に移します。ケプストラム分析だとフーリエ変換で戻してましたけれど、MFCCの場合は離散コサイン変換を使うとのこと。ここら辺がなぜなのか理解できてません。というか離散コサイン変換が何なのかも勉強中です・・・

<pre class="code lang-python" data-lang="python" data-unlink="">    <span class="synComment"># 離散コサイン変換</span>

    ceps = scipy.fftpack.realtransforms.dct(mspec, <span class="synIdentifier">type</span>=<span class="synConstant">2</span>, norm=<span class="synConstant">"ortho"</span>, axis=-<span class="synConstant">1</span>)

    <span class="synComment"># 低次成分からnceps個の係数を返す</span>

    <span class="synStatement">return</span> ceps[:nceps]

</pre>

離散コサイン変換の結果から低次の成分を取り出したものがMFCCです。大体、12次までとることが多いとのこと。なので、nceps=12です。上の音声データだと

<pre class="code" data-lang="" data-unlink="">[ 2.51895741 -0.39441998  0.16150014  0.17564364 -0.72552876 -0.73787793

 -0.16415795  0.07149698  0.24680304  0.02212086 -0.34275272 -0.29347927]</pre>

という結果になりました。うーん、一応それっぽい数値が出てきたけどこれであっているのかな？

今回は、勉強のために自分で実装してみましたが、実際は、[HTK](http://htk.eng.cam.ac.uk/)や[SPTK](/entry/20120805/1343825329)（2012/8/5）のような既存ツールを使えばそこそこ簡単に抽出できます。たぶんこのコードは実験では使いません（笑）

もし間違いがありましたら、コメント欄でぜひ教えてください！よろしくお願いします。

</div>

<div class="section">

### 参考資料

*   [音声認識を紹介するページ](http://recognition.web.fc2.com/) - 音声認識の原理を直感的にわかりやすく解説。
*   [Mel scale - Wikipedia](http://en.wikipedia.org/wiki/Mel_scale)
*   [Mel-frequency cepstrum - Wikipedia](http://en.wikipedia.org/wiki/Mel-frequency_cepstrum)
*   [Miyazawa's Pukiwiki 公開版](http://shower.human.waseda.ac.jp/~m-kouki/pukiwiki_public/66.html) - ケプストラム分析でも参照しましたがその続きです。
*   [Talkbox](http://projects.scipy.org/scikits/wiki/Talkbox) - Pythonで実装したMFCCのコード。一部だけ参考。
*   [Auditory Toolbox](https://engineering.purdue.edu/~malcolm/interval/1998-010/) - Matlabで実装したMFCCのコード
*   [Matlab Central](http://www.mathworks.com/matlabcentral/fileexchange/31328-voice-based-biometric-system/content/MFCC_MLPBPN/melfilter.m) - メルフィルタバンクの作り方はここのコードを参照

</div>

</div>
