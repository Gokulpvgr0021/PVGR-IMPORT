// Gokul Hub - Offline Data Backup & Restore Engine

function exportData() {
    const data = {
        profile: JSON.parse(localStorage.getItem('gokulProfile') || 'null'),
        categories: JSON.parse(localStorage.getItem('gokulVaultCats') || 'null'),
        transactions: JSON.parse(localStorage.getItem('gokulVaultTx') || '[]'),
        shifts: JSON.parse(localStorage.getItem('gokulAttRecords') || '[]'),
        jobProfiles: JSON.parse(localStorage.getItem('gokulJobProfiles') || 'null'),
        loans: JSON.parse(localStorage.getItem('gokulLoans') || '[]'),
        archives: JSON.parse(localStorage.getItem('gokulArchives') || '[]')
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Gokul_Data_Backup.json';
    a.click();
    URL.revokeObjectURL(url);
    alert("Data Backup Downloaded Successfully!");
}

function importData() {
    const fileInput = document.getElementById('import-file');
    if (!fileInput.files.length) return alert("Please select a backup JSON file first.");
    
    const file = fileInput.files[0];
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (data.profile) localStorage.setItem('gokulProfile', JSON.stringify(data.profile));
            if (data.categories) localStorage.setItem('gokulVaultCats', JSON.stringify(data.categories));
            if (data.transactions) localStorage.setItem('gokulVaultTx', JSON.stringify(data.transactions));
            if (data.shifts) localStorage.setItem('gokulAttRecords', JSON.stringify(data.shifts));
            if (data.jobProfiles) localStorage.setItem('gokulJobProfiles', JSON.stringify(data.jobProfiles));
            if (data.loans) localStorage.setItem('gokulLoans', JSON.stringify(data.loans));
            if (data.archives) localStorage.setItem('gokulArchives', JSON.stringify(data.archives));
            
            alert("Data Successfully Restored! The app will now reload.");
            window.location.reload();
        } catch (err) {
            alert("Invalid backup file.");
        }
    };
    reader.readAsText(file);
}
