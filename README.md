# myzmbg
アプリ / the app: <a href="https://reirisono.github.io/myzmbg/myzmbg.html">https://reirisono.github.io/myzmbg/myzmbg.html</a>
日本語と英語の説明あり。Available in Japanese and English.

<h1>日本語</h1>
にじさんじの黛灰が一時期使っていた雑談配信っぽい背景を自動生成します。<br>
JavaScriptをオンにした状態で myzmbg.html をWebブラウザで表示すると、同じテーマですがランダム要素によってディテールが毎回違う画像が生成されます。<br>
"submit" ボタンを何度も押して気に入ったのが出るまで試してみてください。<br>
左の入力フォームから画像サイズやパーツの位置・サイズも一部調整できます。<br>
<h2>入力フォーム仕様</h2>
<h3>大きさ</h3>
<ul>
  <li>スケール: HTML Canvas画像をブラウザ上でリアルサイズで表示するか、見やすいようにピクセル数を減らして表示するかの違いです。テストでは0.25, DL用には1を推奨。</li>
  <li>キャンバス横幅と縦幅：単位＝ピクセル。スケールを1にした場合にDLされる画像の大きさ。</li>
  <li>三角形横幅と縦幅：単位＝ピクセル。デフォでは正三角形になるように調整されています。縦横比率を変えると二等辺三角形になります。各々計算してもろて。形そのままにサイズを変える時は掛け算割り算、形を変える時は三角関数が必要になるかもしれません。</li>
</ul>
<h3>三角形の色</h3>
<p>基本の仕様として、このプログラムでは三角形の色を作る際に「ベースとなる上下グラデ色」＋「ノイズの色」という構造を取っています。ノイズ色は1色ですが、乱数によって全三角形への混入率が均一にばらけています。</p>
<ul>
<li>上側の色、下側の色：RGBA方式でスペース抜きで入力。最初の３つの数字は0-255の整数で、最後は0-1の小数を入力してください。Aの値が大きいほど目立ちます。</li>
<li>ノイズ色：RGB方式でスペース抜きで入力。<b>上下側の色と違い、最後のAにあたる数字は入力不可です。</b></li>
<li>ノイズ色最大混入率：0-1の範囲内で、大きければ大きいほどノイズ色が目立ちます。</li>
</ul>
<h3>三角形の透明度の移行</h3>
<p>基本の仕様として、上の方の三角形はほとんど見えないほど透明に、下の方は不透明です。</p>
<ul>
  <li>位置：0に近いほど上辺で、1に近いほど下辺で透明度の移り変わりが発生します。</li>
  <li>緩急：大きいほど急に、小さいほどゆるやかに透明度が変わります。</li>
  <li>不均一さ：大きいほど移行中の位置にある三角形どうしの透明度がバラけます。</li>
</ul>
<h3>灰ロゴ</h3>
<ul>
  <li>中心点の縦位置：0-1の範囲内で、小さいほど円の中心点が上に、大きいほど下に配置されます。</li>
  <li>直径：画像幅の比率：0-1の範囲内で、円の直径が画像幅に占める比率を決めます。スマホ壁紙など縦長画像の場合は1に近い数値を、パソコン壁紙など横長画像の場合は半分以下を推奨。</li>
  <li>不透明度：0-1の範囲内で、0=見えない, 1=フル原色。</li>
</ul>
<h3>背景数字</h3>
<ul>
	<li>数字の色：RGB方式。3つの0-255の整数。</li>
</ul>
<h3>乱数固定</h3>
該当パーツのチェックボックスをチェックしてから"submit"ボタンを押すと、現在の乱数出力が次の出力に引き継がれます。
ただし、パーツの位置と数が全く同じ場合に限ります。
現在、三角形のノイズ色混入率と透明度、そして背景数字の光り方が独立に固定できます。
<h2>改善点</h2>
<ul>
<li>元ネタの配信の一部では背景の数字マトリックスの光が左から右へと流れますが、これも技術的にちょっとむずいので実装まで時間がかかるかもしれません。少なくともハロウィン2021にまでは実装する予定はありませんので悪しからず。</li>
</ul>

<h1>English</h1>
This is a web-based script that generates an image resembling the virtual background used by Kai Mayuzumi's live casts at one time.<br>
Open myzmbg.html on your web browser with JavaScript turned on to generate an image with the same theme but with slight difference in details due to random variable elements.<br>
Click the "submit" button as many times as you like until you see what you like.<br>
The input form on the left allows adjustment of image size and the locations / sizes of some image elements.<br>
<h2>Input form specs</h2>
<h3>Sizes & scales</h3>
<ul>
  <li>Scale: whether to show the same size of HTML Canvas image object in its real size or shrunken with fewer pixel size for the ease of view. Recommends 0.25 to test and 1 for download.</li>
  <li>Canvas width and height: unit = pixels. The actual size of the downloadable image.</li>
  <li>Triangle width and height: unit = pixels. Adjusted to be equilateral triangles by default. Change the width-heght proportion and you will get isosceles triangles. Please do your own math - changing size while keeping the shape requires multiplication or division; changing the shape may require trigonometry.</li>
</ul>
<h3>Triangle colors</h3>
<p>As a basic spec, this program determines the colors of the triangles as a linear sum of "base gradation (above to below)" + "noise color". There is a single noise color, which "contaminates" all triangles at a uniformly distributed, random proportion.</p>
<ul>
<li>colors above & below: RGBA format, space not allowed. The first three numbers should be an integer within 0-255 and the last should be a decimal number within 0-1. The color stands out more with a bigger "A".</li>
<li>noise color: RGB format, space not allowed. <b>Do not enter the fourth number, unlike the colors above & below.</b></li>
<li>Noise color max mix ratio: within 0-1, larger=see more of mix color.</li>
</ul>
<h3>Triangle transparency transition</h3>
<p>As a basic spec, triangles at the top are nearly invisible and those at the bottom are nearly fully visible.</p>
<ul>
  <li>Location: a number close to 0 makes the transition from invisible to visible happen at the top; a number close to 1 makes it happen at the bottom.</li>
  <li>Suddenness: a large number for sudden transition; small number for a gradual transtion.</li>
  <li>Unevenness: a large number makes the opacity of the triangles at the transition zone more uneven or scattered.</li>
</ul>
<h3>The Logo</h3>
<ul>
  <li>vertical location of center: in a 0-1 range, small value posts the center of the circle at the top; large value posts it at the bottom.</li>
  <li>diameter-to-width proportion: in a 0-1 range, it determines the portion of the image width occupied by the diameter of the circle. A value near 1 is recommended for a long/thin image e.g. for your smart phone; a value below 0.5 is recommended for a short/wide image e.g. for your laptop or desktop.</li>
  <li>transparency: in a 0-1 range, 0=invisible; 1=full brightness.</li>
</ul>
<h3>Background numbers</h3>
<ul>
<li>color of numbers: RGB format, with three integers within 0-255.</li>
</ul>
<h3>Keeping the current random output</h3>
Check the checkbox of the corresponding parts before hitting the "submit" button to keep the current random output to the next output.
However, this is limited to when the exact same number of parts are placed in the exact same positions.
The app currently allows independent fixation of the noise color/transparency of the triangles and the  highlights of the number matrix.
<h2>Issues</h2>
<ul>
<li>Some of the original broadcasts have the highlights of the number matrix flowing from left to right, but this is a bit technically challenging, so it may take some time to implement. At least I won't make it to Halloween 2021. Sorry :(</li>
</ul>
