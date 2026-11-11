# MORROWSEAL 部署说明

## 1. 上传 GitHub

1. 在 GitHub 新建公开仓库，建议名称 `morrowseal`。
2. 不要额外创建 README、License 或 `.gitignore`。
3. 解压 `MORROWSEAL-GITHUB-UPLOAD.zip`，把解压后的全部内容上传到仓库根目录并提交。

## 2. 在 Remix 新建并编译合约

在 Remix 的 `contracts` 文件夹新建：

`MorrowSeal.sol`

复制独立文件 `MorrowSeal.sol` 的全部代码，粘贴后按 `Ctrl+S` 保存。

打开 **Solidity Compiler**：

- 编译器选择 `0.8.24`
- 点击 **Compile MorrowSeal.sol**
- 出现绿色 `Compiled` 即可

## 3. 部署到 BOT Chain

在钱包中添加 BOT Chain Mainnet：

- Network Name：`BOT Chain Mainnet`
- RPC URL：`https://rpc.botchain.ai`
- Chain ID：`677`
- Currency Symbol：`BOT`
- Block Explorer：`https://scan.botchain.ai`

在 Remix 打开 **Deploy & Run Transactions**：

1. Environment 选择 `Browser Extension`。
2. 确认钱包当前网络为 BOT Chain Mainnet。
3. Contract 选择 `MorrowSeal - MorrowSeal.sol`。
4. 构造函数没有参数，直接点击 **Deploy**。
5. 在钱包确认交易。
6. 部署完成后，复制 `Deployed Contracts` 中显示的完整合约地址。

## 4. 在 Vercel 部署前端

1. 在 Vercel 点击 **Add New → Project**。
2. 导入刚才的 GitHub 仓库。
3. Root Directory 选择 `frontend`。
4. Framework Preset 选择 `Vite`。
5. Build Command 使用 `npm run build`，Output Directory 使用 `dist`。
6. 添加环境变量：

```text
Key: VITE_MORROWSEAL_ADDRESS
Value: 0x你的完整合约地址
Environment: Production
Type: Config
```

合约地址是公开信息，不需要设置成 Secret。不要填写钱包私钥或助记词。

7. 点击 **Deploy**。
8. 如果先部署了前端、后添加环境变量，必须进入 **Deployments → Redeploy**，并取消使用旧 Build Cache。

## 5. 网页交互顺序

1. 填写 `Result context` 和 `Private result`。
2. 保留自动生成的 32 字节盐值，点击 `Create commitment`。
3. 先下载 `private opening` 并安全保存；公开分享时只能使用 `public receipt`。
4. 点击 `Connect a wallet`，选择钱包。网页会请求切换或添加 BOT Chain。
5. 点击 `Record on BOT Chain`，钱包确认后生成链上回执编号。
6. 以后在 Open 区域填写原始 context、result、salt 和 commitment，点击 `Verify opening`。
7. 匹配成功后，可以点击 `Confirm local check on-chain`。

## 6. 常见问题

- 页面提示 Preview mode：环境变量没有设置或部署后没有重新部署。
- 钱包按钮没有弹出：确认浏览器安装了钱包扩展；手机用户用页面钱包弹窗中的 MetaMask 深链打开。
- 提示 No contract bytecode：合约地址错误，或钱包不在 BOT Chain。
- 交易被拒绝：钱包余额不足、用户取消，或网络 RPC 暂时不可用。
- 私密结果是否会上链：不会。合约只保存 `bytes32 commitment`、钱包地址和时间戳。

合约和前端未经专业安全审计。先使用少量资金测试，任何时候都不要上传私钥、助记词或私密 opening 文件。
