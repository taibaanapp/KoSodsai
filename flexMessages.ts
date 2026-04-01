export function createTransactionFlexMessage(summary: string, editUrl: string, usedAI: boolean, aiTokens: number, isSingle: boolean) {
  return {
    type: "flex",
    altText: "บันทึกรายการเรียบร้อยครับ",
    contents: {
      type: "bubble",
      size: "mega",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#F97316",
        contents: [
          {
            type: "text",
            text: "บันทึกเรียบร้อยครับ! 📝",
            weight: "bold",
            color: "#ffffff",
            size: "lg"
          }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: summary,
            wrap: true,
            size: "sm",
            color: "#374151"
          },
          {
            type: "separator",
            margin: "lg"
          },
          ...(usedAI ? [
            {
              type: "text",
              text: `✨ ตีความโดย Gemini AI (${aiTokens} tokens)`,
              size: "xxs",
              color: "#9CA3AF",
              margin: "md"
            }
          ] : [])
        ]
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          {
            type: "button",
            style: "primary",
            color: "#F97316",
            action: {
              type: "uri",
              label: isSingle ? "แก้ไขรายการนี้" : "ดูรายการทั้งหมด",
              uri: editUrl
            }
          }
        ]
      }
    }
  };
}
