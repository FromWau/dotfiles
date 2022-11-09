#!/bin/bash

# check java is installed
if ! command -v java &> /dev/null
then
    echo "Please install Java (and add to path) first!!" 
    exit 1;
fi

# check if npm is installed
if ! command -v npm &> /dev/null 
then
    echo "Please install npm first!!" 
    exit 1;
fi

# Cloning repos
[ -d ~/.config/nvim/java-debug ] && rm -rf ~/.config/nvim/java-debug
git clone https://github.com/microsoft/java-debug.git ~/.config/nvim/java-debug

[ -d ~/.config/nvim/vscode-java-test ] && rm -rf ~/.config/nvim/vscode-java-test
git clone https://github.com/microsoft/vscode-java-test.git ~/.config/nvim/vscode-java-test


# install java-debug
echo "Installing java-debug..."
cd ~/.config/nvim/java-debug && 
    if ! ./mvnw clean install 
    then
        echo "Failed installing java-debug" 
        exit 1
    fi

# install vscode-java-test
echo "Installing vscode-java-test..."
cd ~/.config/nvim/vscode-java-test && 
    if ! ( npm i && npm run build-plugin ) 
    then 
        echo "Failed installing vscode-java-test" 
        exit 1
    fi


echo "Installed java-debug and vscode-java-test"
exit 0
