FROM openjdk:8-nanoserver-1809 as dev
ADD https://nodejs.org/dist/v14.15.4/node-v14.15.4-win-x64.zip C:/
ADD https://downloads.apache.org/maven/maven-3/3.6.3/binaries/apache-maven-3.6.3-bin.zip C:/
ADD https://github.com/k-yokoi/CCVolti/archive/master.zip C:/
RUN jar -xf C:/node-v14.15.4-win-x64.zip && \
	jar -xf C:/apache-maven-3.6.3-bin.zip && \
	jar -xf C:/master.zip && \
	cd C:/CCVolti-master && \
	C:/apache-maven-3.6.3/bin/mvn.cmd -Dmaven.artifact.threads=8 package

FROM mcr.microsoft.com/windows/nanoserver:1809 as plugin-builder
COPY --from=dev C:/node-v14.15.4-win-x64 C:/node-v14.15.4-win-x64
COPY --from=dev C:/node-v14.15.4-win-x64 C:/Windows/System32
COPY . C:/plugin
WORKDIR C:/plugin
USER ContainerAdministrator
RUN setx /M PATH C:\node-v14.15.4-win-x64;%PATH% && \
	npm install -g yarn && \
	yarn install && \
	yarn run build

FROM mcr.microsoft.com/windows/servercore:1809
MAINTAINER Zulu Enterprise Container Images <azul-zulu-images@microsoft.com>
RUN setx PACKAGE zulu-8-azure-jdk_8.54.0.21-8.0.292-win_x64.msi && \
    setx PACKAGE_DIR zulu-8/8u292 && \
    setx /m JAVA_HOME "C:\Program Files\Zulu\zulu-8"
RUN powershell -Command [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12;(new-object System.Net.WebClient).DownloadFile('https://repos.azul.com/azure-only/zulu/packages/zulu-8/8u292/zulu-8-azure-jdk_8.54.0.21-8.0.292-win_x64.msi', 'C:\%PACKAGE%')
RUN msiexec /quiet /i C:\%PACKAGE% && \
    del C:\%PACKAGE%
RUN mkdir C:\CCVolti && \
	mkdir tmp
COPY --from=dev C:/node-v14.15.4-win-x64 C:/node-v14.15.4-win-x64
COPY --from=dev C:/CCVolti-master/target/ccvolti.jar C:/CCVolti/ccvolti.jar
COPY --from=dev C:/CCVolti-master/E2LSH C:/CCVolti/E2LSH
COPY --from=dev C:/CCVolti-master/FALCONN C:/CCVolti/FALCONN
COPY --from=dev C:/CCVolti-master/FALCONN32 C:/CCVolti/FALCONN32
COPY --from=plugin-builder C:/plugin/dist/bundle.js C:/plugin.js
COPY ./oc.csv ./oc.csv
RUN setx /M JAVA_HOME "C:\Program Files\Zulu\zulu-8" && \
setx /M PATH C:\node-v14.15.4-win-x64;"C:\Program Files\Zulu\zulu-8\bin";C:\Windows;
ENTRYPOINT [ "node", "C:/plugin.js"]
