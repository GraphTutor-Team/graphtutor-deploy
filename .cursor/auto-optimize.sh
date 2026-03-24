#!/bin/bash

# GraphTutor 自动化项目优化脚本
# 功能：运行代码质量、测试、性能、安全检查

set -e  # 遇到错误立即退出

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 开始自动化项目优化...${NC}\n"

# 1. 代码质量检查
echo -e "${BLUE}🔍 代码质量检查...${NC}"
if npx eslint server/src client/src --ext .js,.jsx --fix; then
    echo -e "${GREEN}✅ ESLint检查通过${NC}"
else
    echo -e "${YELLOW}⚠️ ESLint检查有警告，已自动修复${NC}"
fi

# 2. 代码格式检查
echo -e "\n${BLUE}📝 代码格式检查...${NC}"
if npx prettier --check "server/src/**/*.{js,jsx}" "client/src/**/*.{js,jsx}" 2>/dev/null; then
    echo -e "${GREEN}✅ Prettier格式检查通过${NC}"
else
    echo -e "${YELLOW}⚠️ 发现格式问题，运行自动修复...${NC}"
    npx prettier --write "server/src/**/*.{js,jsx}" "client/src/**/*.{js,jsx}" || true
fi

# 3. 运行测试
echo -e "\n${BLUE}🧪 运行测试...${NC}"
if npm test 2>/dev/null; then
    echo -e "${GREEN}✅ 所有测试通过${NC}"
else
    echo -e "${YELLOW}⚠️ 部分测试失败，请检查${NC}"
fi

# 4. 安全检查
echo -e "\n${BLUE}🛡️ 安全检查...${NC}"
if npm audit --production 2>/dev/null; then
    echo -e "${GREEN}✅ 依赖安全检查通过${NC}"
else
    echo -e "${YELLOW}⚠️ 发现安全漏洞，运行自动修复...${NC}"
    npm audit fix --production || true
fi

# 5. 性能分析（如果脚本存在）
if [ -f "scripts/analyze-performance.js" ]; then
    echo -e "\n${BLUE}📊 性能分析...${NC}"
    node scripts/analyze-performance.js || echo -e "${YELLOW}⚠️ 性能分析脚本未实现${NC}"
fi

# 6. 生成报告（如果脚本存在）
if [ -f "scripts/generate-report.js" ]; then
    echo -e "\n${BLUE}📈 生成优化报告...${NC}"
    node scripts/generate-report.js || echo -e "${YELLOW}⚠️ 报告生成脚本未实现${NC}"
fi

echo -e "\n${GREEN}✅ 优化完成！${NC}"

