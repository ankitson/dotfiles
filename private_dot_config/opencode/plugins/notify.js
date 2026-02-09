import { exec } from "child_process";

export const NotifyPlugin = async () => {
  return {
    event: async ({ event }) => {
      if (
        event.type === "session.idle" ||
        event.type === "permission.asked"
      ) {
        exec("printf '\\a'");
      }
    },
  };
};
