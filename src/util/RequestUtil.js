import store from "../store/store.js";
import _ from "lodash";
import {encodeChat} from "gpt-tokenizer";

// 请求地址
const API_URL = "v1/chat/completions";
// 请求方式
const REQ_TYPE = "POST";
// 字符解码器
const decoder = new TextDecoder('utf-8');

export class RequestUtil {
  // stream读取器
  reader = null;
  changeFunc = () => {
  };

  data = {
    robotIndex: 0,
    tabIndex: 0,
    content: "",
  };

  addUserMessage() {
    store.commit("addUserMessage", {
      robotIndex: this.data.robotIndex,
      tabIndex: this.data.tabIndex,
      content: this.data.content,
    });
    this.changeFunc();
  }

  addAssistantMessage = () => {
    store.commit("addAssistantMessage", {
      robotIndex: this.data.robotIndex,
      tabIndex: this.data.tabIndex,
    });
    this.changeFunc();
  };

  setAssistantMsgContent = (content) => {
    store.commit("setAssistantMsgContent", {
      robotIndex: this.data.robotIndex,
      tabIndex: this.data.tabIndex,
      content: content,
    });
    this.changeFunc();
  };

  addAssistantMsgContent = (content) => {
    store.commit("addAssistantMsgContent", {
      robotIndex: this.data.robotIndex,
      tabIndex: this.data.tabIndex,
      content: content,
    });
    this.changeFunc();
  };

  setGenerating = (generating) => {
    store.commit("setGenerating", {
      robotIndex: this.data.robotIndex,
      tabIndex: this.data.tabIndex,
      generating: generating,
    });
  };

  sendRequest = ({robotIndex, tabIndex, content}, change) => {
    if (change) {
      this.changeFunc = change;
    }
    // 检查并初始化数据
    this.checkRequestData(robotIndex, tabIndex, content);
    // 设置内容
    this.data = {
      robotIndex: robotIndex,
      tabIndex: tabIndex,
      content: content,
    };
    try {
      // 设置当前状态为生成中
      this.setGenerating(true);
      // 添加用户信息
      this.addUserMessage();
      // 获取配置信息
      const robotOptions = this.getRobotOptions(robotIndex);
      const messages = this.getContextMessages(robotIndex, tabIndex, robotOptions);
      // 添加助手信息
      this.addAssistantMessage();
      // 发送请求
      this.sendFetch(messages, robotOptions);
    } catch
      (exception) {
      console.error(exception);
      // 写入错误信息
      this.setAssistantMsgContent(exception.message);
      // 当前状态为生成完成
      this.setGenerating(false);
    }
  }

  getContextMessages = (robotIndex, tabIndex, options) => {
    // 拷贝聊天记录，用于发送请求
    let messages = _.cloneDeep(store.state.chatHistory[robotIndex][tabIndex].chat);
    if (options.context_max_message <= 0 || options.context_max_tokens <= 0) {
      return messages[0];
    }
    // 获取指定数量的上下文消息
    let contextMessages;
    if (options.context_max_message >= messages.length - 1) {
      contextMessages = messages;
    } else {
      const systemMessage = messages[0];
      contextMessages = [systemMessage, ...messages.slice(-(options.context_max_message + 1))];
    }
    // 检查上下文中的消息是否已经超过最大token数量
    while (encodeChat(contextMessages, options.model).length > options.context_max_tokens) {
      // 消息的token数量超过了最大token数量，需要删除消息
      if (contextMessages.length === 1) {
        // 只有一条消息，为prompt，无法删除
        break;
      }
      // 有多条消息，删除除了prompt之外的第一条消息
      contextMessages.splice(1, 1);
    }
    return contextMessages;
  }

  getRobotOptions = (robotIndex) => {
    let robotOptions = store.state.robotList[robotIndex].options;
    // 获取配置信息
    if (!robotOptions.enabled) {
      // 获取全局配置
      return store.state.config.base;
    }
    return robotOptions;
  }

  checkRequestData = (robotIndex, tabIndex, content) => {
    // 检查并初始化数据
    if (content.length <= 0) {
      console.error("无信息可发送");
      throw Error("无信息可发送");
    }
    if (!(robotIndex >= 0 && tabIndex >= 0)) {
      console.error("无效的索引");
      throw Error("无效的索引");
    }
  };

  buildHeaders = () => {
    const apiKey = store.state.config.base.apiKey;
    if (!apiKey || apiKey === "" || apiKey.length < 3) {
      throw Error("请输入正确的ApiKey");
    }
    return {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };
  };

  buildBodyJson = (messages, options) => {
    let requestObject = {
      messages,
      model: options.model,
      stream: true,
      temperature: options.temperature,
    };
    if (options.response_max_tokens > 0) {
      requestObject["max_tokens"] = options.response_max_tokens;
    }
    return JSON.stringify(requestObject);
  };

  sendFetch = (messages, options) => {
    const controller = new AbortController();
    fetch(options.apiUrl + API_URL, {
      method: REQ_TYPE,
      headers: this.buildHeaders(),
      body: this.buildBodyJson(messages, options),
      signal: controller.signal,
    }).then((data) => {
      this.reader = data.body.getReader();
      this.reader.read().then(this.readResponse);
      // 当前状态为生成完成
      this.setGenerating(false);
    }).catch((error) => {
      console.error(error);
      // 显示错误信息
      this.addAssistantMsgContent(error.message);
      // 当前状态为生成完成
      this.setGenerating(false);
    });
  };

  readResponse = (result) => {
    if (result.done) {
      console.log("读取完成");
      return;
    }
    // 这是一个 Uint8Array 类型的字节数组，需要进行解码
    let str = decoder.decode(result.value);
    // 有可能获取的一个数据包中有多个独立的块，使用data:进行分割
    let strArr = str.split("data:");
    // 循环解析
    for (let string of strArr) {
      // 跳过空字符串
      if (string.length === 0) {
        continue;
      }
      // 判断是否读取完成
      if (string.trim() === "[DONE]") {
        console.log("读取完成");
        return;
      }
      // 解析返回的json格式数据
      let resultData = JSON.parse(string);
      // 判断是否存在错误信息，若存在错误信息则表示请求失败
      if (resultData.error) {
        // 返回错误信息
        this.setAssistantMsgContent(resultData.error.message);
        return;
      }
      // 解析获取到的数据
      let choices = resultData.choices;
      for (let choice of choices) {
        let delta = choice.delta;
        // 检查content，没有直接跳过
        if (delta.content) {
          this.addAssistantMsgContent(delta.content);
        }
      }
    }
    // 继续读取剩余的数据
    this.reader.read().then(this.readResponse);
  };

}
