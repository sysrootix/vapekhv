#!/bin/bash

# Цвета для вывода
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Checking for changes...${NC}"

# Проверка наличия изменений
if [[ -z $(git status -s) ]]; then
    echo -e "${YELLOW}⚠️  No changes to commit${NC}"
    exit 0
fi

# Показать статус
echo -e "\n${BLUE}📋 Current status:${NC}"
git status -s

# Добавить все изменения
echo -e "\n${BLUE}➕ Adding all changes...${NC}"
git add .

# Запросить commit message у пользователя
echo -e "\n${GREEN}💬 Enter commit message:${NC}"
read -r COMMIT_MESSAGE

# Если сообщение не введено, использовать дефолтное
if [[ -z "$COMMIT_MESSAGE" ]]; then
    COMMIT_MESSAGE="Update: $(date '+%Y-%m-%d %H:%M:%S')"
    echo -e "${YELLOW}Using default message: $COMMIT_MESSAGE${NC}"
fi

# Создать коммит
echo -e "\n${BLUE}📝 Creating commit...${NC}"
git commit -m "$COMMIT_MESSAGE"

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Commit failed${NC}"
    exit 1
fi

# Пуш в удаленный репозиторий
echo -e "\n${BLUE}🚀 Pushing to GitHub...${NC}"
git push origin main

if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}✅ Successfully pushed to GitHub!${NC}"
else
    echo -e "\n${RED}❌ Push failed. Please check your connection and try again.${NC}"
    exit 1
fi
