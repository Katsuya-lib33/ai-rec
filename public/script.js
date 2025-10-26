document.getElementById('uploadButton').addEventListener('click', async () => {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    const statusText = document.getElementById('statusText');
    const uploadButton = document.getElementById('uploadButton');
    const transcriptionOutput = document.getElementById('transcriptionOutput');
    const summaryOutput = document.getElementById('summaryOutput');

    if (!file) {
        statusText.textContent = 'ファイルが選択されていません。';
        return;
    }

    // Disable button and clear previous results
    uploadButton.disabled = true;
    uploadButton.textContent = '処理中...';
    statusText.textContent = '準備中...';
    transcriptionOutput.value = '';
    summaryOutput.value = '';

    try {
        // Step 1: Get a presigned URL from our serverless function
        statusText.textContent = 'アップロード用URLを取得中...';
        const { url, key } = await fetch(`/api/generate-upload-url?filename=${encodeURIComponent(file.name)}&contentType=${encodeURIComponent(file.type)}`).then(res => res.json());

        // Step 2: Upload the file directly to the storage provider (e.g., Cloudflare R2)
        statusText.textContent = 'ファイルをアップロード中...';
        await fetch(url, {
            method: 'PUT',
            body: file,
            headers: {
                'Content-Type': file.type,
            },
        });

        // Step 3: Notify our backend to start processing the file
        statusText.textContent = 'AIによる処理をリクエスト中...';
        const processResponse = await fetch(`/api/process-file`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ key }),
        });

        if (!processResponse.ok) {
            throw new Error('AI処理の開始に失敗しました。');
        }

        const { transcription, summary } = await processResponse.json();

        transcriptionOutput.value = transcription;
        summaryOutput.value = summary;
        statusText.textContent = '処理が完了しました！';

    } catch (error) {
        console.error('エラーが発生しました:', error);
        statusText.textContent = `エラー: ${error.message}`;
    } finally {
        // Re-enable button
        uploadButton.disabled = false;
        uploadButton.textContent = 'アップロードして実行';
    }
});
