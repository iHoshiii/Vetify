import { appointmentKeys } from '@/hooks/useAppointments';
import { ApiError } from '@/services/api';
import { requestAppointment, type RequestResult } from '@/services/appointments.service';
import { professionalKeys } from '@/hooks/useProfessionals';
import type { AppointmentRequestInput } from '@shared/schemas';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { appointmentRequestId, finishAppointmentRequest } from '@/services/appointment-request-id';

/** A batch that half-succeeded: which runs went through, and the slot that was gone. */
export class PartialRequestError extends ApiError {
  constructor(public done: number, public takenAt: string) {
    super(409, 'Somebody just took one of those times.', 'slot-taken');
  }
}

// Fires the runs in order and stops at the first that clashes, so a 409 names the exact slot lost.
async function requestAll(
  inputs: AppointmentRequestInput[],
  requestIds: Map<string, string>
): Promise<RequestResult> {
  let last: RequestResult | null = null;
  for (let i = 0; i < inputs.length; i += 1) {
    try {
      const key = JSON.stringify(inputs[i]);
      const requestId = requestIds.get(key) ?? (await appointmentRequestId(inputs[i]));
      requestIds.set(key, requestId);
      last = await requestAppointment(inputs[i], requestId);
    } catch (error) {
      if (error instanceof ApiError && error.reason === 'slot-taken') {
        throw new PartialRequestError(i, inputs[i].startsAt);
      }
      throw error;
    }
  }
  // The last reply's mail line is the one the notice shows; every run emails the same vet.
  return last as RequestResult;
}

/** Asks for each run as its own booking. One submit, several appointments. */
export function useBatchRequest() {
  const queryClient = useQueryClient();
  const requestIds = useRef(new Map<string, string>());
  const abandon = (attempt = requestIds.current) => {
    for (const [key, requestId] of attempt) {
      finishAppointmentRequest(JSON.parse(key) as AppointmentRequestInput, requestId);
    }
    attempt.clear();
    if (attempt === requestIds.current) requestIds.current = new Map();
  };

  const mutation = useMutation<
    RequestResult,
    Error,
    AppointmentRequestInput[],
    Map<string, string>
  >({
    onMutate: () => requestIds.current,
    mutationFn: (inputs) => requestAll(inputs, requestIds.current),
    onSuccess: (_result, inputs, attempt) => {
      for (const input of inputs) {
        const key = JSON.stringify(input);
        const requestId = attempt?.get(key);
        if (requestId) finishAppointmentRequest(input, requestId);
        attempt?.delete(key);
      }
    },
    onError: (error, _inputs, attempt) => {
      if (error instanceof PartialRequestError && attempt) abandon(attempt);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
      void queryClient.invalidateQueries({ queryKey: professionalKeys.slots() });
    },
  });
  return {
    ...mutation,
    reset: () => {
      abandon();
      mutation.reset();
    },
  };
}
