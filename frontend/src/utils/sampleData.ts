import { UploadedFileInfo } from '../types';

export const SAMPLE_EMAIL_RECORDS: Record<string, any>[] = [
  { 'Email Address': 'randi.nilsen@online.no', 'Domain': 'online.no', 'Type': 'Personal' },
  { 'Email Address': 'kjersti_engebretsen@hotmail.com', 'Domain': 'hotmail.com', 'Type': 'Personal' },
  { 'Email Address': 'wenche.nilssen@gmail.com', 'Domain': 'gmail.com', 'Type': 'Personal' },
  { 'Email Address': 'morten.rygg@vestland.no', 'Domain': 'vestland.no', 'Type': 'Work' },
  { 'Email Address': 'nina.braaten@yahoo.no', 'Domain': 'yahoo.no', 'Type': 'Personal' },
  { 'Email Address': 'linda.hansen88@outlook.com', 'Domain': 'outlook.com', 'Type': 'Personal' },
  { 'Email Address': 'geir.johansen@telenor.no', 'Domain': 'telenor.no', 'Type': 'Work' },
  { 'Email Address': 'astrid.larsen@viken.no', 'Domain': 'viken.no', 'Type': 'Work' },
  { 'Email Address': 'bjorn.eriksen@broadpark.no', 'Domain': 'broadpark.no', 'Type': 'Personal' },
  { 'Email Address': 'silje.pedersen@gmail.com', 'Domain': 'gmail.com', 'Type': 'Personal' },
  { 'Email Address': 'trond.olsen.consulting@gmail.com', 'Domain': 'gmail.com', 'Type': 'Business' },
  { 'Email Address': 'marit_andersen77@online.no', 'Domain': 'online.no', 'Type': 'Personal' },
  { 'Email Address': 'ole.gunnar.solbakken@dnb.no', 'Domain': 'dnb.no', 'Type': 'Work' },
  { 'Email Address': 'karin.berg@posten.no', 'Domain': 'posten.no', 'Type': 'Work' },
  { 'Email Address': 'lars.kristiansen@live.no', 'Domain': 'live.no', 'Type': 'Personal' },
  { 'Email Address': 'hege.moen@equinor.com', 'Domain': 'equinor.com', 'Type': 'Corporate' },
  { 'Email Address': 'espen.haugen@uio.no', 'Domain': 'uio.no', 'Type': 'Academic' },
  { 'Email Address': 'camilla.dahl@broadpark.no', 'Domain': 'broadpark.no', 'Type': 'Personal' },
  { 'Email Address': 'tore.sandberg@tele2.no', 'Domain': 'tele2.no', 'Type': 'Personal' },
  { 'Email Address': 'mona.strand@gmail.com', 'Domain': 'gmail.com', 'Type': 'Personal' }
];

export const SAMPLE_NAMES_RECORDS: Record<string, any>[] = [
  { 'User Name (FB)': 'Randi Nilsen', 'Country': 'Norway', 'FB_ID': '100084729182', 'Status': 'Active' },
  { 'User Name (FB)': 'Kjersti Engebretsen', 'Country': 'Norway', 'FB_ID': '100091827364', 'Status': 'Active' },
  { 'User Name (FB)': 'Wenche Nilssen', 'Country': 'Norway', 'FB_ID': '100062534129', 'Status': 'Active' },
  { 'User Name (FB)': 'Morten Rygg', 'Country': 'Norway', 'FB_ID': '100078912453', 'Status': 'Active' },
  { 'User Name (FB)': 'Nina Bråten', 'Country': 'Norway', 'FB_ID': '100054398124', 'Status': 'Active' },
  { 'User Name (FB)': 'Linda Hansen', 'Country': 'Norway', 'FB_ID': '100039847156', 'Status': 'Active' },
  { 'User Name (FB)': 'Geir Johansen', 'Country': 'Norway', 'FB_ID': '100049281745', 'Status': 'Active' },
  { 'User Name (FB)': 'Astrid Larsen', 'Country': 'Norway', 'FB_ID': '100087463920', 'Status': 'Active' },
  { 'User Name (FB)': 'Bjørn Eriksen', 'Country': 'Norway', 'FB_ID': '100028475913', 'Status': 'Active' },
  { 'User Name (FB)': 'Silje Pedersen', 'Country': 'Norway', 'FB_ID': '100095837261', 'Status': 'Active' },
  { 'User Name (FB)': 'Trond Olsen', 'Country': 'Norway', 'FB_ID': '100038294715', 'Status': 'Active' },
  { 'User Name (FB)': 'Marit Andersen', 'Country': 'Norway', 'FB_ID': '100019284756', 'Status': 'Active' },
  { 'User Name (FB)': 'Ole Gunnar Solbakken', 'Country': 'Norway', 'FB_ID': '100048271938', 'Status': 'Active' },
  { 'User Name (FB)': 'Karin Berg', 'Country': 'Norway', 'FB_ID': '100073829145', 'Status': 'Active' },
  { 'User Name (FB)': 'Lars Kristiansen', 'Country': 'Norway', 'FB_ID': '100082918374', 'Status': 'Active' },
  { 'User Name (FB)': 'Hege Moen', 'Country': 'Norway', 'FB_ID': '100094827163', 'Status': 'Active' },
  { 'User Name (FB)': 'Espen Haugen', 'Country': 'Norway', 'FB_ID': '100063928174', 'Status': 'Active' },
  { 'User Name (FB)': 'Camilla Dahl', 'Country': 'Norway', 'FB_ID': '100085938271', 'Status': 'Active' },
  { 'User Name (FB)': 'Tore Sandberg', 'Country': 'Norway', 'FB_ID': '100029481756', 'Status': 'Active' },
  { 'User Name (FB)': 'Mona Strand', 'Country': 'Norway', 'FB_ID': '100074829103', 'Status': 'Active' }
];

export function getSampleEmailFileInfo(): UploadedFileInfo {
  return {
    file: null,
    fileName: 'sample_emails_norway_2026.csv',
    fileSize: 1420,
    rowCount: SAMPLE_EMAIL_RECORDS.length,
    headers: Object.keys(SAMPLE_EMAIL_RECORDS[0]),
    records: SAMPLE_EMAIL_RECORDS,
    detectedColumn: 'Email Address',
    isSample: true,
  };
}

export function getSampleNamesFileInfo(): UploadedFileInfo {
  return {
    file: null,
    fileName: 'sample_facebook_names_norway.xlsx',
    fileSize: 2840,
    rowCount: SAMPLE_NAMES_RECORDS.length,
    headers: Object.keys(SAMPLE_NAMES_RECORDS[0]),
    records: SAMPLE_NAMES_RECORDS,
    detectedColumn: 'User Name (FB)',
    isSample: true,
  };
}
