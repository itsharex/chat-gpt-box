import CSettingsDialog from "@/components/base/dialog/CSettingsDialog.vue";
import {ChatGptModelList} from "@/models/ChatGptModelList.ts";
import {BaseSettingsDialogUtil} from "@/utils/settings/BaseSettingsDialogUtil.ts";

export class ChatGptSettingsDialogUtil extends BaseSettingsDialogUtil {
  
  static showTemperatureDialog(dialogRefs: InstanceType<typeof CSettingsDialog>, value: number) {
    const description = "The lower this value, the more rigorous the output will be; " +
      "the higher the value, the more random the output will be. " +
      "Too low or too high can both affect the quality of what's generated, generally maintaining it at 0.7 is sufficient.";
    return dialogRefs.show({
      type: "slider",
      title: "Temperature",
      description: description,
      content: value,
      sliderOptions: {
        min: 0,
        max: 1,
        step: 0.1,
        showInput: true,
        size: "small"
      }
    });
  }
  
  static showChatGptModelDialog(dialogRefs: InstanceType<typeof CSettingsDialog>, value: string) {
    return this.showModelDialog(dialogRefs, ChatGptModelList, value);
  }
  
  static showContextMaxMessagesDialog(dialogRefs: InstanceType<typeof CSettingsDialog>, value: number) {
    const description = "If the number of tokens in a message exceeds the maximum number of tokens configured for the current request, " +
      "the number of messages sent will be appropriately reduced until it conforms to the limit set by the maximum tokens configuration.";
    return dialogRefs.show({
      type: "slider",
      title: "Context max messages",
      description: description,
      content: value,
      sliderOptions: {
        min: 0,
        max: 20,
        step: 1,
        showInput: true,
        size: "small"
      }
    });
  }
  
  static showContextMaxTokensDialog(dialogRefs: InstanceType<typeof CSettingsDialog>, value: number) {
    const description = "The request for tokens is limited by the set number of request messages. " +
      "Calculate whether the tokens for the specified number of messages exceed this value. If they do, " +
      "reduce the number of request messages until it falls below this limit.";
    return dialogRefs.show({
      type: "slider",
      title: "Context max tokens",
      description: description,
      content: value,
      sliderOptions: {
        min: 1,
        max: 4096,
        step: 1,
        showInput: true,
        size: "small"
      }
    });
  }
  
  static showResponseMaxTokensDialog(dialogRefs: InstanceType<typeof CSettingsDialog>, value: number) {
    const description: string = "When the value is 0, the number of tokens returned is automatic.";
    return dialogRefs.show({
      type: "slider",
      title: "Response max tokens",
      description: description,
      content: value,
      sliderOptions: {
        min: 0,
        max: 4096,
        step: 1,
        showInput: true,
        size: "small"
      }
    });
  }
}