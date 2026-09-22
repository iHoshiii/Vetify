import { messageKeys } from '@/hooks/useMessages';
import {
  editMessage,
  unsendMessage,
  type Message,
  type MessagePage,
} from '@/services/messages.service';
import { useMutation, useQueryClient } from '@tanstack/react-query';

type EditInput = { messageId: string; body: string };

function useReplaceMessage(threadId: string) {
  const queryClient = useQueryClient();
  const threadQueryKey = [...messageKeys.all, 'thread', threadId] as const;

  return (updated: Message) => {
    queryClient.setQueriesData<MessagePage>({ queryKey: threadQueryKey }, (page) =>
      page
        ? {
            ...page,
            items: page.items.map((message) => (message.id === updated.id ? updated : message)),
          }
        : page
    );
    void queryClient.invalidateQueries({ queryKey: messageKeys.all });
  };
}

export function useEditMessage(threadId: string) {
  const replaceMessage = useReplaceMessage(threadId);
  return useMutation<Message, Error, EditInput>({
    mutationFn: ({ messageId, body }) => editMessage(threadId, messageId, body),
    onSuccess: replaceMessage,
  });
}

export function useUnsendMessage(threadId: string) {
  const replaceMessage = useReplaceMessage(threadId);
  return useMutation<Message, Error, string>({
    mutationFn: (messageId) => unsendMessage(threadId, messageId),
    onSuccess: replaceMessage,
  });
}
