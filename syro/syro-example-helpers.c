// Code copied from korg_syro_volcasample_example.c from
// the main syro repository. main/main2 functions removed
// and adapted in sample-web.c.

/************************************************************************
	SYRO for volca sample
      Example 
 ***********************************************************************/
#ifdef _MSC_VER
#define _CRT_SECURE_NO_WARNINGS
#endif
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include "./volcasample/syro/korg_syro_volcasample.h"
#include "./volcasample/syro/korg_syro_comp.h"

#define	MAX_SYRO_DATA	10

static const uint8_t wav_header[] = {
	'R' , 'I' , 'F',  'F',		// 'RIFF'
	0x00, 0x00, 0x00, 0x00,		// Size (data size + 0x24)
	'W',  'A',  'V',  'E',		// 'WAVE'
	'f',  'm',  't',  ' ',		// 'fmt '
	0x10, 0x00, 0x00, 0x00,		// Fmt chunk size
	0x01, 0x00,					// encode(wav)
	0x02, 0x00,					// channel = 2
	0x44, 0xAC, 0x00, 0x00,		// Fs (44.1kHz)
	0x10, 0xB1, 0x02, 0x00,		// Bytes per sec (Fs * 4)
	0x04, 0x00,					// Block Align (2ch,16Bit -> 4)
	0x10, 0x00,					// 16Bit
	'd',  'a',  't',  'a',		// 'data'
	0x00, 0x00, 0x00, 0x00		// data size(bytes)
};

#define WAVFMT_POS_ENCODE	0x00
#define WAVFMT_POS_CHANNEL	0x02
#define WAVFMT_POS_FS		0x04
#define WAVFMT_POS_BIT		0x0E

#define WAV_POS_RIFF_SIZE	0x04
#define WAV_POS_WAVEFMT		0x08
#define WAV_POS_DATA_SIZE	0x28


/*----------------------------------------------------------------------------
	Write 32Bit Value
 ----------------------------------------------------------------------------*/
static void set_32Bit_value(uint8_t *ptr, uint32_t dat)
{
	int i;
	
	for (i=0; i<4; i++) {
		*ptr++ = (uint8_t)dat;
		dat >>= 8;
	}
}

/*----------------------------------------------------------------------------
	Read 32Bit Value
 ----------------------------------------------------------------------------*/
static uint32_t get_32Bit_value(uint8_t *ptr)
{
	int i;
	uint32_t dat;
	
	dat = 0;
	
	for (i=0; i<4; i++) {
		dat <<= 8;
		dat |= (uint32_t)ptr[3-i];
	}
	return dat;
}

/*----------------------------------------------------------------------------
	Read 16Bit Value
 ----------------------------------------------------------------------------*/
static uint16_t get_16Bit_value(uint8_t *ptr)
{
	uint16_t dat;
	
	dat = (uint16_t)ptr[1];
	dat <<= 8;
	dat |= (uint16_t)ptr[0];
	
	return dat;
}

/*----------------------------------------------------------------------------
	setup & load file (sample)
 ----------------------------------------------------------------------------*/
static bool setup_file_sample(uint8_t *src, uint32_t size, SyroData *syro_data)
{
	uint32_t wav_pos, chunk_size;
	uint32_t wav_fs;
	uint16_t num_of_ch, sample_byte;
	uint32_t num_of_frame;
	
	if (!src) {
		printf("No src provided\n");
		return false;
	}
		
	if (size <= sizeof(wav_header)) {
		printf ("wav file error, too small.\n");
		return false;
	}
	
	//------- check header/fmt -------*/
	if (memcmp(src, wav_header, 4)) {
		printf ("wav file error, 'RIFF' is not found.\n");
		return false;
	}

	if (memcmp((src + WAV_POS_WAVEFMT), (wav_header + WAV_POS_WAVEFMT), 8)) {
		printf ("wav file error, 'WAVE' or 'fmt ' is not found.\n");
		return false;
	}
	
	wav_pos = WAV_POS_WAVEFMT + 4;		// 'fmt ' pos
	
	if (get_16Bit_value(src+wav_pos+8+WAVFMT_POS_ENCODE) != 1) {
		printf ("wav file error, encode must be '1'.\n");
		return false;
	}

	num_of_ch = get_16Bit_value(src+wav_pos+8+WAVFMT_POS_CHANNEL);
	if ((num_of_ch != 1) && (num_of_ch != 2)) {
		printf ("wav file error, channel must be 1 or 2.\n");
		return false;
	}
	
	{
		uint16_t num_of_bit;
		
		num_of_bit = get_16Bit_value(src+wav_pos+8+WAVFMT_POS_BIT);
		if ((num_of_bit != 16) && (num_of_bit != 24)) {
			printf ("wav file error, bit must be 16 or 24.\n");
			return false;
		}
		
		sample_byte = (num_of_bit / 8);
	}
	wav_fs = get_32Bit_value(src+wav_pos+8+WAVFMT_POS_FS);
	
	//------- search 'data' -------*/
	for (;;) {
		chunk_size = get_32Bit_value(src+wav_pos+4);
		if (!memcmp((src+wav_pos), "data", 4)) {
			break;
		}
		wav_pos += chunk_size + 8;
		if ((wav_pos+8) > size) {
			printf ("wav file error, 'data' chunk not found.\n");
			return false;
		}
	}
	
	if ((wav_pos+chunk_size+8) > size) {
		printf ("wav file error, illegal 'data' chunk size.\n");
		return false;
	}
	
	//------- setup  -------*/
	num_of_frame = chunk_size  / (num_of_ch * sample_byte);
	chunk_size = (num_of_frame * 2);
	syro_data->pData = malloc(chunk_size);
	if (!syro_data->pData) {
		printf ("not enough memory to setup file. \n");
		return false;
	}
	
	//------- convert to 1ch, 16Bit  -------*/
	{
		uint8_t *poss;
		int16_t *posd;
		int32_t dat, datf;
		uint16_t ch, sbyte;
		
		poss = (src + wav_pos + 8);
		posd = (int16_t *)syro_data->pData;
		
		for (;;) {
			datf = 0;
			for (ch=0; ch<num_of_ch; ch++) {
				dat = ((int8_t *)poss)[sample_byte - 1];
				for (sbyte=1; sbyte<sample_byte; sbyte++) {
					dat <<= 8;
					dat |= poss[sample_byte-1-sbyte];
				}
				poss += sample_byte;
				datf += dat;
			}
			datf /= num_of_ch;
			*posd++ = (int16_t)datf;
			if (!(--num_of_frame)) {
				break;
			}
		}
	}
	
	syro_data->Size = chunk_size;
	syro_data->Fs = wav_fs;
	syro_data->SampleEndian = LittleEndian;
		
	printf ("ok.\n");
	
	return true;
}

/*----------------------------------------------------------------------------
	free data memory
 ----------------------------------------------------------------------------*/
static void free_syrodata(SyroData *syro_data, int num_of_data)
{
	int i;
	
	for (i=0; i<num_of_data; i++) {
		if (syro_data->pData) {
			free(syro_data->pData);
			syro_data->pData = NULL;
		}
		syro_data++;
	}
}
