'use client';

import { useState } from 'react';
import {
  Box,
  Button,
  Card,
  Flex,
  Heading,
  Text,
  TextField,
  Checkbox,
  Separator,
} from '@radix-ui/themes';
import { submitConsent } from '@/app/consent-form/actions';
import { CheckIcon, Cross2Icon } from '@radix-ui/react-icons';

interface ConsentFormProps {
  fullName: string;
  studentId?: string; // Optional, might be pre-filled
  course?: string; // Optional, might be pre-filled
}

export function ConsentForm({ fullName, studentId = '', course = '' }: ConsentFormProps) {
  const [signature, setSignature] = useState('');
  const [agreedStudent, setAgreedStudent] = useState(false);
  const [agreedParent, setAgreedParent] = useState(false);

  // Form logic
  const isSignatureValid = signature.trim() === fullName;
  const canSubmit = agreedStudent && agreedParent && isSignatureValid;

  return (
    <Card size="4" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <Flex direction="column" gap="5">
        {/* Header */}
        <Box>
          <Heading size="6" align="center" mb="2">
            UGC Anti-Ragging Undertaking
          </Heading>
          <Text as="p" size="2" color="gray" align="center">
            As per UGC regulations, all students and their parents must submit this undertaking at
            the beginning of each academic year.
          </Text>
        </Box>

        <Separator size="4" />

        {/* Student Information */}
        <Box>
          <Heading size="4" mb="3">
            Student Information
          </Heading>
          <Flex direction="column" gap="3">
            <Flex gap="2">
              <Text weight="bold" style={{ width: '120px' }}>
                Name:
              </Text>
              <Text>{fullName}</Text>
            </Flex>
            {studentId && (
              <Flex gap="2">
                <Text weight="bold" style={{ width: '120px' }}>
                  Student ID:
                </Text>
                <Text>{studentId}</Text>
              </Flex>
            )}
            {course && (
              <Flex gap="2">
                <Text weight="bold" style={{ width: '120px' }}>
                  Course:
                </Text>
                <Text>{course}</Text>
              </Flex>
            )}
          </Flex>
        </Box>

        <Separator size="4" />

        {/* Declaration Text */}
        <Box>
          <Heading size="4" mb="4" align="center">
            UNDERTAKING FROM THE STUDENT
          </Heading>

          <Flex direction="column" gap="4">
            <Text as="p" size="2" style={{ lineHeight: 1.6 }}>
              1) I, <Text weight="bold">{fullName}</Text>
              {studentId ? `, with Student ID ${studentId}` : ''}, have received and carefully read
              the UGC Regulations on Curbing the Menace of Ragging in Higher Educational
              Institutions, 2009, (hereinafter called the “Regulations”).
            </Text>
            <Text as="p" size="2" style={{ lineHeight: 1.6 }}>
              2) I have, in particular, perused clause 3 of the Regulations and am aware as to what
              constitutes ragging.
            </Text>
            <Text as="p" size="2" style={{ lineHeight: 1.6 }}>
              3) I have also, in particular, perused clause 7 and clause 9.1 of the Regulations and
              am fully aware of the penal and administrative action that is liable to be taken
              against me in case I am found guilty of or abetting ragging, actively or passively, or
              being part of a conspiracy to promote ragging.
            </Text>
            <Text as="p" size="2" style={{ lineHeight: 1.6 }}>
              4) I hereby solemnly aver and undertake that:
              <br />
              &nbsp;&nbsp;&nbsp;&nbsp;a) I will not indulge in any behavior or act that may be
              constituted as ragging under clause 3 of the Regulations.
              <br />
              &nbsp;&nbsp;&nbsp;&nbsp;b) I will not participate in or abet or propagate through any
              act of commission or omission that may be constituted as ragging under clause 3 of the
              Regulations.
            </Text>
            <Text as="p" size="2" style={{ lineHeight: 1.6 }}>
              5) I hereby affirm that, if found guilty of ragging, I am liable for punishment
              according to clause 9.1 of the Regulations, without prejudice to any other criminal
              action that may be taken against me under any penal law or any law for the time being
              in force.
            </Text>
            <Text as="p" size="2" style={{ lineHeight: 1.6 }}>
              6) I hereby declare that I have not been expelled or debarred from admission in any
              institution in the country on account of being found guilty of, abetting or being part
              of a conspiracy to promote, ragging; and further affirm that, in case the declaration
              is found to be untrue, I am aware that my admission is liable to be cancelled.
            </Text>
          </Flex>
        </Box>

        <Separator size="4" />

        {/* Checkboxes */}
        <Flex direction="column" gap="3">
          <Text
            as="label"
            size="2"
            style={{ cursor: 'pointer', display: 'flex', gap: '8px', alignItems: 'start' }}
          >
            <Checkbox checked={agreedStudent} onCheckedChange={(c) => setAgreedStudent(!!c)} />
            I, the student, have read and understood the declaration.
          </Text>
          <Text
            as="label"
            size="2"
            style={{ cursor: 'pointer', display: 'flex', gap: '8px', alignItems: 'start' }}
          >
            <Checkbox checked={agreedParent} onCheckedChange={(c) => setAgreedParent(!!c)} />I
            confirm that my parent/guardian has also read and understood this undertaking. (A
            separate undertaking from your parent/guardian may be required by the institution).
          </Text>
        </Flex>

        <Separator size="4" />

        {/* Digital Signature */}
        <Box>
          <Heading size="3" mb="3">
            Digital Signature
          </Heading>
          <Text as="p" size="2" color="gray" mb="3">
            Please type your full name in the box below to digitally sign this undertaking. Your
            typed name will be considered your legal signature for this document.
          </Text>

          <form action={submitConsent}>
            <Flex direction="column" gap="4">
              <Box>
                <TextField.Root
                  placeholder="Type your full name here"
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  name="signature"
                  size="3"
                >
                  <TextField.Slot>
                    {isSignatureValid ? <CheckIcon color="green" /> : <Cross2Icon color="gray" />}
                  </TextField.Slot>
                </TextField.Root>
                {!isSignatureValid && signature.length > 0 && (
                  <Text size="1" color="red" mt="1">
                    Signature must exactly match your full name: &quot;{fullName}&quot;
                  </Text>
                )}
              </Box>

              {/* Hidden inputs for server action */}
              <input type="hidden" name="studentId" value={studentId} />
              <input type="hidden" name="course" value={course} />
              <input type="hidden" name="fullName" value={fullName} />

              <Box>
                <Text size="1" color="gray" mb="2" style={{ display: 'block' }}>
                  By clicking &quot;Digitally Sign and Submit&quot;, I declare that the information
                  provided is true and correct. I understand this is a legally binding document.
                </Text>
                <Button size="3" disabled={!canSubmit} style={{ width: '100%' }}>
                  Digitally Sign and Submit
                </Button>
              </Box>
            </Flex>
          </form>
        </Box>
      </Flex>
    </Card>
  );
}
