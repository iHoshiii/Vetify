import { appointmentKeys } from '@/hooks/useAppointments';
import { ApiError } from '@/services/api';
import { requestAppointment, type RequestResult } from '@/services/appointments.service';
import { professionalKeys } from '@/hooks/useProfessionals';
import type { AppointmentRequestInput } from '@shared/schemas';
import { useMutation, useQueryClient } from '@tanstack/react-query';

/** A batch that half-succeeded: which runs went through, and the slot that was gone. */
export class PartialRequestError extends ApiError {
  constructor(public done: number, public takenAt: string) {
    super(409, 'Somebody just took one of those times.', 'slot-taken');
  }
}

// Fires the runs in order and stops at the first that clashes, so a 409 names the exact slot lost.
async function requestAll(inputs: AppointmentRequestInput[]): Promise<RequestResult> {
  let last: RequestResult | null = null;
  for (let i = 0; i < inputs.length; i += 1) {
    try {
      last = await requestAppointment(inputs[i]);
    } catch (error) {
      if (error instanceof ApiError && error.reason === 'slot-taken') {
        throw new PartialRequestError(i, inputs[i].startsAt);
      }
      throw error;
    }
  }
  // The last reply's mail line is the one the notice shows; every run emails the same pair.
  return last as RequestResult;
}

/** Asks for each run as its own booking. One submit, several appointments. */
export function useBatchRequest() {
  const queryClient = useQueryClient();

  return useMutation<RequestResult, Error, AppointmentRequestInput[]>({
    mutationFn: requestAll,
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
      void queryClient.invalidateQueries({ queryKey: professionalKeys.slots() });
    },
  });
}
