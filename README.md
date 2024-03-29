## 追加機能(2023/02/14)

CCXを拡張し、異なるコードクローン検出ツールの検出結果を比較して表示する新たな機能を追加しました。

機能の詳しい説明、使用方法などに関しては以下のドキュメントを読んでください。

[新規比較機能の使い方](/docs/CCXDocument_ja.pdf)

本機能を実装した研究成果は第214回ソフトウェア工学発表会で発表されました。

- [小林　亮太, 松島　誠, 肥後　芳樹: "異なるコードクローン検出ツールの結果を比較して表示する手法の提案", 電子情報通信学会, vol.2023-SE-214, 2023年7月](https://sel.ist.osaka-u.ac.jp/lab-db/betuzuri/archive/1268/1268.pdf)

## Additional Functions(2023/02/14)

A new function has been added to compare and display the detection results of different code clone detection tools. Please read the following document for a detailed description of the feature and how to use it.

[How to use the new comparison function](/docs/CCXDocument_en.pdf)

# ccx

CCXは、SaaS型コードクローン分析システムです。
いろいろなコードクローン分析ツールをプラグインとして組み込むことにより、いろいろなツールを統一的に操作し、その結果を比較することができるようになります。
Webブラウザから、分析対象のレポジトリ、種々のパラメータを指定し、実行することで、分析ツール自体をローカルマシンにインストールすることなく利用できるようになります。

本レポジトリにはCCXのソースコードが置かれています。

大阪大学で運用しているCCXは、以下のURLから利用することができます。現在、この阪大CCXでは、CCFinderSW, CCFinderX, CCVolti, Deckard, NiCadの５種類の分析ツールを利用することができます。

[阪大CCXへのログイン](https://sel.ist.osaka-u.ac.jp/webapps/ccx/login)

CCXの使い方は以下のドキュメントを読んでください。

[使い方](/docs/usage.ja.md)

また、CCXに新たな分析ツールをプラグインとして追加するには以下のドキュメントを参照してください。

[pluginの仕様](/docs/plugin.ja.md)

CCXに関する研究論文などは以下を御覧ください。

- [松島 一樹, 井上 克郎: "高い拡張性を備えた SaaS 型コードクローン分析システムの提案", 信学技報, vol. 120, no. 82, SS2020-1, pp. 1-6, 2020年7月.,](https://sel.ist.osaka-u.ac.jp/lab-db/betuzuri/archive/1187/1187.pdf)
- [Kazuki Matsushima, Katsuro Inoue: "Comparison and Visualization of Code Clone Detection Results", Proceedings of the 2020 IEEE 14th International Workshop on Software Clones, London, Ontario, Canada, 2020-02.](https://sel.ist.osaka-u.ac.jp/lab-db/betuzuri/archive/1180/1180.pdf)
- [松島 一樹, 井上 克郎: "複数コードクローン検出結果の比較・表示ツール", SES2019, 2019-8.](https://sel.ist.osaka-u.ac.jp/lab-db/betuzuri/archive/1170/1170.pdf)

## CCX

CCX is a SaaS type code clone analysis system. By incorporating a variety of code clone analysis tools as plug-ins, you can utilize the various tools in a uniformed manner and compare the results. By specifying the target GitHub repository and various parameters from a web browser, the system can be used without installing the analysis tool itself on the local machine.

The source code of CCX is located in this repository.

The CCX operated at Osaka University can be used at the following URL. Currently, this Osaka University CCX provides five types of analysis tools: CCFinderSW, CCFinderX, CCVolti, Deckard, and NiCad.

[Log-in to the Osaka University CCX](https://sel.ist.osaka-u.ac.jp/webapps/ccx/login)

Please read this document for the usage of CCX.

[How to use CCX](/docs/usage.en.md)


Also, to add new analysis tools to CCX as plug-ins, please refer to the following document.

[Specification of the plugin (only Japanese)](/docs/plugin.ja.md)

For more information about CCX, please refer to the above paper.

11:55~12:00の間は、CCXの再起動のため、正常に動作しない可能性があります。

現在，Deckardは保守中で正しい答えがでません。

gitリポジトリは英語以外のパス名を含まないようにしてください。

git repository should not include non-English character path names.

現在、システムが過負荷にならないよう、クローン検出に5分以上要する場合は強制終了するようにしています。


Currently, to prevent the system from being overloaded, each  clone detection is forced to terminate if it takes more than 5 minutes.
