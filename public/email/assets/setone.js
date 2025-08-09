const SettingsTemplates = {
    settingsPage: `
        <div class="settings-container">
          <div class="settings-navigation">
             <div class="settings-nav-item" data-target="notification">邮件映射</div>
             <div class="settings-nav-item" data-target="account">账户设置</div>
             <div class="settings-nav-item" data-target="privacy">隐私设置</div>
             <div class="settings-nav-item" data-target="general">通用设置</div>
          </div>
          <div class="settings-content">
            <div id="notification" class="settings-section">
              <h2>邮件映射</h2>
              <div class="mapping-intro">
                <div class="info-box">
                  <i class="info-icon">i</i>
                  <span>邮件映射功能是将原本不存在的邮箱地址的邮件转发给你当前用户的邮箱地址。</span>

                </div>
              </div>
              
              <div class="mapping-container">
                <div class="mapping-display">
                  <label>默认接收邮件：</label>
                  <span class="current-email" id="default-email">加载中...</span>
                </div>
                
                <div class="mapping-add">
                  <label>添加新邮件地址，并映射给当前用户的邮件：</label>
                  <div class="mapping-form">
                    <input type="email" placeholder="输入新邮件地址" class="new-email-input" id="new-mapping-email">
                    <button class="save-mapping-btn" id="save-mapping-btn">保存映射</button>
                    <div class="email-validation-message" id="email-validation-message" style="display: none; color: #dc3545; font-size: 15px; margin-top: 5px; width: 100%;">
                      邮件地址后缀必须为 @shaoxin.top
                    </div>
                  </div>
                </div>
                
                <div class="mapping-rules">
                  <label>存在的映射规则：</label>
                  <div class="rules-list" id="mapping-rules-list">
                    <div class="loading">正在加载映射规则...</div>
                  </div>
                </div>
              </div>
            </div>
            <div id="account" class="settings-section">
              <h2>账户设置</h2>
              <p>管理您的账户信息和安全设置</p>
              <div class="account-settings">
                <div class="setting-group">
                  <h3>基本信息</h3>
                  <div class="form-group">
                    <label>用户名：</label>
                    <input type="text" id="username" placeholder="当前用户名">
                  </div>
                  <div class="form-group">
                    <label>邮箱：</label>
                    <input type="email" id="email" value="current@user.com" readonly>
                  </div>
                </div>
                <div class="setting-group">
                  <h3>修改密码</h3>
                  <div class="form-group">
                    <label>原密码：</label>
                    <input type="password" id="current-password" placeholder="请输入原密码">
                  </div>
                  <div class="form-group">
                    <label>新密码：</label>
                    <input type="password" id="new-password" placeholder="请输入新密码">
                  </div>
                  <div class="form-group">
                    <label>确认密码：</label>
                    <input type="password" id="confirm-password" placeholder="请再次输入新密码">
                  </div>
                  <button class="change-password-btn">修改密码</button>
                </div>
              </div>
            </div>
            <div id="privacy" class="settings-section">
              <h2>隐私设置</h2>
              <p>管理您的隐私偏好和数据保护设置</p>
              <div>隐私设置详细内容</div>
            </div>
            <div id="general" class="settings-section">
              <h2>通用设置</h2>
              <p>配置应用的通用选项和偏好</p>
              <div>通用设置详细内容</div>
            </div>
          </div>
        </div>
    `,

    styles: `
        .settings-container {
         margin: 3% auto 8% auto;
         width: 95%;
         height: 95vh;
         display: flex;
         flex-direction: row;
         box-sizing: border-box;
         background-color: #fff;
         border-radius: 8px;
         box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
         overflow: hidden;
     }
     
     .settings-navigation {
         width: 15%;
         min-width: 150px;
         background-color: #f8f9fa;
         border-right: 1px solid #e9ecef;
         padding: 20px;
         box-sizing: border-box;
         overflow-y: auto;
         flex-shrink: 0;
     }
     
     .settings-nav-item {
         padding: 12px 15px;
         margin-bottom: 8px;
         background-color: transparent;
         color: #495057;
         border-radius: 4px;
         cursor: pointer;
         text-align: left;
         font-size: 14px;
         transition: all 0.3s ease;
         border: none;
         width: 100%;
         display: block;
     }
     
     .settings-nav-item:hover {
         background-color: #e9ecef;
         color: #007bff;
     }
     
     .settings-nav-item.active {
         background-color: #e3f2fd;
         color: #007bff;
         font-weight: 500;
     }
     
     .settings-content {
         width: 85%;
         flex: 1;
         padding: 0;
         box-sizing: border-box;
         overflow-y: auto;
         scroll-behavior: smooth;
         position: relative;
     }
     
     .settings-section {
         min-height: 100%;
         padding: 40px;
         box-sizing: border-box;
         border-bottom: 1px solid #e9ecef;
         display: flex;
         flex-direction: column;
         justify-content: flex-start;
     }
     
     .settings-section:last-child {
         border-bottom: none;
     }
     
     .settings-section h2 {
         color: #007bff;
         margin-bottom: 20px;
         font-size: 24px;
         margin-top: 0;
     }
     
     /* 邮件映射新样式 */
     .mapping-intro {
         margin-bottom: 25px;
     }
     
     .info-box {
         display: flex;
         align-items: flex-start;
         gap: 10px;
         padding: 15px;
         background-color: #e3f2fd;
         border-left: 4px solid #007bff;
         border-radius: 4px;
         margin-bottom: 20px;
     }
     
     .info-box .info-icon {
         background-color: #007bff;
         color: white;
         width: 20px;
         height: 20px;
         border-radius: 50%;
         display: flex;
         align-items: center;
         justify-content: center;
         font-size: 12px;
         font-style: italic;
         font-weight: bold;
         flex-shrink: 0;
         margin-top: 2px;
     }
     
     .info-box span {
         color: #495057;
         font-size: 14px;
         line-height: 1.5;
     }
     
     .mapping-container {
         display: flex;
         flex-direction: column;
         gap: 25px;
     }
     
     .mapping-display {
         display: flex;
         align-items: center;
         gap: 10px;
         font-size: 16px;
     }
     
     .mapping-display label {
         font-weight: 500;
         color: #495057;
         margin: 0;
     }
     
     .current-email {
         color: #007bff;
         font-weight: 600;
         padding: 8px 12px;
         background-color: #f8f9fa;
         border-radius: 4px;
         border: 1px solid #e9ecef;
     }
     
     .mapping-add {
         display: flex;
         flex-direction: column;
         gap: 10px;
     }
     
     .mapping-add label {
         font-weight: 500;
         color: #495057;
         margin: 0;
     }
     
     .mapping-form {
         display: flex;
         align-items: center;
         gap: 10px;
         flex-wrap: wrap;
     }
     
     .new-email-input {
         padding: 10px 12px;
         border: 1px solid #ced4da;
         border-radius: 4px;
         font-size: 14px;
         min-width: 250px;
     }
     
     .save-mapping-btn {
         padding: 10px 20px;
         background-color: #28a745;
         color: white;
         border: none;
         border-radius: 4px;
         cursor: pointer;
         font-size: 14px;
         transition: background-color 0.3s ease;
     }
     
     .save-mapping-btn:hover {
         background-color: #218838;
     }
     
     .mapping-rules {
         display: flex;
         flex-direction: column;
         gap: 15px;
     }
     
     .mapping-rules label {
         font-weight: 500;
         color: #495057;
         margin: 0;
     }
     
     .rules-list {
         display: flex;
         flex-direction: column;
         gap: 10px;
     }
     
     .rule-item {
         display: flex;
         align-items: center;
         gap: 10px;
         padding: 12px;
         background-color: #f8f9fa;
         border-radius: 4px;
         border: 1px solid #e9ecef;
     }
     
     .source-email, .target-email {
         color: #495057;
         font-weight: 500;
     }
     
     .arrow {
         color: #007bff;
         font-weight: bold;
     }
     
     .delete-rule {
         padding: 5px 10px;
         background-color: #dc3545;
         color: white;
         border: none;
         border-radius: 4px;
         cursor: pointer;
         font-size: 12px;
         margin-left: auto;
     }
     
     .delete-rule:hover {
         background-color: #c82333;
     }
     
     .loading {
         color: #6c757d;
         font-style: italic;
         text-align: center;
         padding: 20px;
     }
     
     .error {
         color: #dc3545;
         background-color: #f8d7da;
         border: 1px solid #f5c6cb;
         padding: 10px;
         border-radius: 4px;
         margin: 10px 0;
     }
     
     .success {
         color: #155724;
         background-color: #d4edda;
         border: 1px solid #c3e6cb;
         padding: 10px;
         border-radius: 4px;
         margin: 10px 0;
     }
     
     .account-settings {
         display: flex;
         flex-direction: column;
         gap: 30px;
     }
     
     .setting-group h3 {
         color: #495057;
         margin-bottom: 15px;
         font-size: 18px;
     }
     
     .form-group {
         margin-bottom: 15px;
     }
     
     .form-group label {
         display: block;
         margin-bottom: 5px;
         font-weight: 500;
         color: #495057;
     }
     
     .form-group input {
         width: 100%;
         max-width: 300px;
         padding: 10px 12px;
         border: 1px solid #ced4da;
         border-radius: 4px;
         font-size: 14px;
     }
     
     .form-group input[readonly] {
         background-color: #f8f9fa;
         color: #495057;
         cursor: not-allowed;
     }
     
     .change-password-btn {
         padding: 10px 20px;
         background-color: #007bff;
         color: white;
         border: none;
         border-radius: 4px;
         cursor: pointer;
         font-size: 14px;
         transition: background-color 0.3s ease;
     }
     
     .change-password-btn:hover {
         background-color: #0056b3;
     }
`
};

// 导出模板对象
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SettingsTemplates;
} else {
    window.SettingsTemplates = SettingsTemplates;
}